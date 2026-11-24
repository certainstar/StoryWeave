//! 章节与关联读写。

use super::events::get_event;
use super::guards::{delete_row, require_character};
use super::inputs::ChapterInput;
use super::support::{new_id, next_sort, now, storage};
use super::vocab_ext::{ensure_label, CAT_CHAPTER_STATUS};
use crate::domain::{require_name, require_vocab_label, require_permutation, require_unique};
use crate::error::ApiError;
use crate::models::Chapter;
use rusqlite::{params, Connection, OptionalExtension};

pub fn list_chapters(conn: &Connection) -> Result<Vec<Chapter>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, status, summary, content, sort_order, created_at, updated_at
             FROM chapters ORDER BY sort_order, title",
        )
        .map_err(storage)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Chapter {
                id: row.get(0)?,
                title: row.get(1)?,
                status: row.get(2)?,
                summary: row.get(3)?,
                content: row.get(4)?,
                sort_order: row.get(5)?,
                character_ids: Vec::new(),
                event_ids: Vec::new(),
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(storage)?;
    let mut chapters = rows.collect::<Result<Vec<_>, _>>().map_err(storage)?;
    for chapter in &mut chapters {
        chapter.character_ids = link_ids(conn, "chapter_characters", "character_id", &chapter.id)?;
        chapter.event_ids = link_ids(conn, "chapter_events", "event_id", &chapter.id)?;
    }
    Ok(chapters)
}

pub fn create_chapter(conn: &Connection, input: ChapterInput) -> Result<Chapter, ApiError> {
    let title = require_name(input.title.as_deref().unwrap_or(""))?;
    let status = require_vocab_label(&input.status.unwrap_or_else(|| "构思中".into()))?;
    let stamp = now();
    let id = new_id();
    let sort_order = next_sort(conn, "chapters")?;
    conn.execute(
        "INSERT INTO chapters (id, title, status, summary, content, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![
            id,
            title,
            status,
            input.summary.unwrap_or_default(),
            input.content.unwrap_or_default(),
            sort_order,
            stamp
        ],
    )
    .map_err(storage)?;
    ensure_label(conn, CAT_CHAPTER_STATUS, &status)?;
    get_chapter(conn, &id)
}

pub fn update_chapter(conn: &Connection, id: &str, input: ChapterInput) -> Result<Chapter, ApiError> {
    let current = get_chapter(conn, id)?;
    let title = match input.title {
        Some(title) => require_name(&title)?,
        None => current.title,
    };
    let status = match input.status {
        Some(s) => require_vocab_label(&s)?,
        None => current.status,
    };
    let summary = input.summary.unwrap_or(current.summary);
    let content = input.content.unwrap_or(current.content);
    let character_ids = input.character_ids.unwrap_or(current.character_ids);
    let event_ids = input.event_ids.unwrap_or(current.event_ids);
    require_unique(&character_ids)?;
    require_unique(&event_ids)?;
    for character_id in &character_ids {
        require_character(conn, character_id)?;
    }
    for event_id in &event_ids {
        get_event(conn, event_id)?;
    }
    let tx = conn.unchecked_transaction().map_err(storage)?;
    let changed = tx
        .execute(
            "UPDATE chapters SET title = ?1, status = ?2, summary = ?3, content = ?4, updated_at = ?5 WHERE id = ?6",
            params![title, status, summary, content, now(), id],
        )
        .map_err(storage)?;
    if changed == 0 {
        return Err(ApiError::not_found());
    }
    replace_links(&tx, "chapter_characters", "character_id", id, &character_ids)?;
    replace_links(&tx, "chapter_events", "event_id", id, &event_ids)?;
    tx.commit().map_err(storage)?;
    ensure_label(conn, CAT_CHAPTER_STATUS, &status)?;
    get_chapter(conn, id)
}

pub fn delete_chapter(conn: &Connection, id: &str) -> Result<String, ApiError> {
    delete_row(conn, "DELETE FROM chapters WHERE id = ?1", id)
}

pub fn reorder_chapters(conn: &Connection, ids: &[String]) -> Result<Vec<Chapter>, ApiError> {
    let existing = list_chapters(conn)?;
    let existing_ids: Vec<String> = existing.iter().map(|chapter| chapter.id.clone()).collect();
    require_permutation(&existing_ids, ids)?;
    let tx = conn.unchecked_transaction().map_err(storage)?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE chapters SET sort_order = ?1 WHERE id = ?2",
            params![index as i64 + 1, id],
        )
        .map_err(storage)?;
    }
    tx.commit().map_err(storage)?;
    list_chapters(conn)
}

pub(crate) fn get_chapter(conn: &Connection, id: &str) -> Result<Chapter, ApiError> {
    let mut chapter = conn
        .query_row(
            "SELECT id, title, status, summary, content, sort_order, created_at, updated_at FROM chapters WHERE id = ?1",
            [id],
            |row| {
                Ok(Chapter {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    status: row.get(2)?,
                    summary: row.get(3)?,
                    content: row.get(4)?,
                    sort_order: row.get(5)?,
                    character_ids: Vec::new(),
                    event_ids: Vec::new(),
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )
        .optional()
        .map_err(storage)?
        .ok_or_else(ApiError::not_found)?;
    chapter.character_ids = link_ids(conn, "chapter_characters", "character_id", id)?;
    chapter.event_ids = link_ids(conn, "chapter_events", "event_id", id)?;
    Ok(chapter)
}

fn link_ids(conn: &Connection, table: &str, column: &str, chapter_id: &str) -> Result<Vec<String>, ApiError> {
    let sql = format!("SELECT {column} FROM {table} WHERE chapter_id = ?1 ORDER BY {column}");
    let mut stmt = conn.prepare(&sql).map_err(storage)?;
    let rows = stmt
        .query_map([chapter_id], |row| row.get(0))
        .map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

fn replace_links(
    conn: &Connection,
    table: &str,
    column: &str,
    chapter_id: &str,
    ids: &[String],
) -> Result<(), ApiError> {
    conn.execute(&format!("DELETE FROM {table} WHERE chapter_id = ?1"), [chapter_id])
        .map_err(storage)?;
    for id in ids {
        conn.execute(
            &format!("INSERT INTO {table} (chapter_id, {column}) VALUES (?1, ?2)"),
            params![chapter_id, id],
        )
        .map_err(storage)?;
    }
    Ok(())
}