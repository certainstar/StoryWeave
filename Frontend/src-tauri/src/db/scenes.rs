//! 章节场景读写。

use super::chapters::get_chapter;
use super::guards::delete_row;
use super::inputs::SceneInput;
use super::maps::map_scene;
use super::support::{blank_to_null, new_id, now, storage};
use crate::domain::{require_name, require_permutation};
use crate::error::ApiError;
use crate::models::Scene;
use rusqlite::{params, Connection, OptionalExtension};

pub fn list_scenes(conn: &Connection, chapter_id: &str) -> Result<Vec<Scene>, ApiError> {
    get_chapter(conn, chapter_id)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, chapter_id, title, summary, story_time, sort_order, created_at, updated_at
             FROM scenes WHERE chapter_id = ?1 ORDER BY sort_order, title",
        )
        .map_err(storage)?;
    let rows = stmt
        .query_map([chapter_id], map_scene)
        .map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

pub fn create_scene(conn: &Connection, input: SceneInput) -> Result<Scene, ApiError> {
    let chapter_id = input.chapter_id.clone().unwrap_or_default();
    get_chapter(conn, &chapter_id)?;
    let title = require_name(input.title.as_deref().unwrap_or(""))?;
    let sort_order = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM scenes WHERE chapter_id = ?1",
            [&chapter_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(storage)?;
    let stamp = now();
    let id = new_id();
    conn.execute(
        "INSERT INTO scenes (id, chapter_id, title, summary, story_time, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![
            id,
            chapter_id,
            title,
            input.summary.unwrap_or_default(),
            blank_to_null(input.story_time),
            sort_order,
            stamp
        ],
    )
    .map_err(storage)?;
    get_scene(conn, &id)
}

pub fn update_scene(conn: &Connection, id: &str, input: SceneInput) -> Result<Scene, ApiError> {
    let current = get_scene(conn, id)?;
    let title = match &input.title {
        Some(title) => require_name(title)?,
        None => current.title,
    };
    let summary = input.summary.unwrap_or(current.summary);
    let story_time = match input.story_time {
        Some(value) => blank_to_null(Some(value)),
        None => current.story_time,
    };
    let changed = conn
        .execute(
            "UPDATE scenes SET title = ?1, summary = ?2, story_time = ?3, updated_at = ?4 WHERE id = ?5",
            params![title, summary, story_time, now(), id],
        )
        .map_err(storage)?;
    if changed == 0 {
        return Err(ApiError::not_found());
    }
    get_scene(conn, id)
}

pub fn delete_scene(conn: &Connection, id: &str) -> Result<String, ApiError> {
    delete_row(conn, "DELETE FROM scenes WHERE id = ?1", id)
}

pub fn reorder_scenes(conn: &Connection, chapter_id: &str, ids: &[String]) -> Result<Vec<Scene>, ApiError> {
    let existing = list_scenes(conn, chapter_id)?;
    let existing_ids: Vec<String> = existing.iter().map(|scene| scene.id.clone()).collect();
    require_permutation(&existing_ids, ids)?;
    let tx = conn.unchecked_transaction().map_err(storage)?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE scenes SET sort_order = ?1 WHERE id = ?2 AND chapter_id = ?3",
            params![index as i64 + 1, id, chapter_id],
        )
        .map_err(storage)?;
    }
    tx.commit().map_err(storage)?;
    list_scenes(conn, chapter_id)
}

fn get_scene(conn: &Connection, id: &str) -> Result<Scene, ApiError> {
    conn.query_row(
        "SELECT id, chapter_id, title, summary, story_time, sort_order, created_at, updated_at FROM scenes WHERE id = ?1",
        [id],
        map_scene,
    )
    .optional()
    .map_err(storage)?
    .ok_or_else(ApiError::not_found)
}