//! 笔记读写。

use super::guards::delete_row;
use super::inputs::NoteInput;
use super::maps::map_note;
use super::support::{new_id, now, storage, to_json};
use crate::domain::{require_name, require_permutation};
use crate::error::ApiError;
use crate::models::Note;
use rusqlite::{params, Connection, OptionalExtension};

/// 笔记列表，按 `sort_order`。
pub fn list_notes(conn: &Connection) -> Result<Vec<Note>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, content, tags_json, sort_order, created_at, updated_at
             FROM notes ORDER BY sort_order ASC, updated_at DESC",
        )
        .map_err(storage)?;
    let rows = stmt.query_map([], map_note).map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

/// 新建笔记。
pub fn create_note(conn: &Connection, input: NoteInput) -> Result<Note, ApiError> {
    let title = require_name(input.title.as_deref().unwrap_or(""))?;
    let sort_order: i64 = conn
        .query_row("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM notes", [], |row| row.get(0))
        .map_err(storage)?;
    let stamp = now();
    let note = Note {
        id: new_id(),
        title,
        content: input.content.unwrap_or_default(),
        tags: input.tags.unwrap_or_default(),
        sort_order,
        created_at: stamp.clone(),
        updated_at: stamp,
    };
    save_note(conn, &note)?;
    Ok(note)
}

/// 修改笔记。
pub fn update_note(conn: &Connection, id: &str, input: NoteInput) -> Result<Note, ApiError> {
    let mut note = get_note(conn, id)?;
    if let Some(title) = input.title {
        note.title = require_name(&title)?;
    }
    if let Some(content) = input.content {
        note.content = content;
    }
    if let Some(tags) = input.tags {
        note.tags = tags;
    }
    note.updated_at = now();
    save_note(conn, &note)?;
    Ok(note)
}

/// 删除笔记。
pub fn delete_note(conn: &Connection, id: &str) -> Result<String, ApiError> {
    delete_row(conn, "DELETE FROM notes WHERE id = ?1", id)
}

/// 重排笔记。`ids` 必须是全部笔记的一个排列。
pub fn reorder_notes(conn: &Connection, ids: &[String]) -> Result<Vec<Note>, ApiError> {
    let existing = list_notes(conn)?;
    let existing_ids: Vec<String> = existing.iter().map(|note| note.id.clone()).collect();
    require_permutation(&existing_ids, ids)?;
    let tx = conn.unchecked_transaction().map_err(storage)?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE notes SET sort_order = ?1 WHERE id = ?2",
            params![index as i64 + 1, id],
        )
        .map_err(storage)?;
    }
    tx.commit().map_err(storage)?;
    list_notes(conn)
}

fn get_note(conn: &Connection, id: &str) -> Result<Note, ApiError> {
    conn.query_row(
        "SELECT id, title, content, tags_json, sort_order, created_at, updated_at FROM notes WHERE id = ?1",
        [id],
        map_note,
    )
    .optional()
    .map_err(storage)?
    .ok_or_else(ApiError::not_found)
}

fn save_note(conn: &Connection, note: &Note) -> Result<(), ApiError> {
    conn.execute(
        "INSERT INTO notes (id, title, content, tags_json, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET title = ?2, content = ?3, tags_json = ?4, sort_order = ?5, updated_at = ?7",
        params![
            note.id,
            note.title,
            note.content,
            to_json(&note.tags),
            note.sort_order,
            note.created_at,
            note.updated_at
        ],
    )
    .map_err(storage)?;
    Ok(())
}