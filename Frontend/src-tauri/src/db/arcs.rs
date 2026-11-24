//! 故事线读写。

use super::events::get_event;
use super::guards::delete_row;
use super::inputs::ArcInput;
use super::support::{new_id, next_sort, now, storage};
use super::vocab_ext::{ensure_label, CAT_ARC_KINDS};
use crate::domain::{require_name, require_permutation, require_vocab_label, require_unique};
use crate::error::ApiError;
use crate::models::StoryArc;
use rusqlite::{params, Connection, OptionalExtension};

pub fn list_arcs(conn: &Connection) -> Result<Vec<StoryArc>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, kind, summary, sort_order, created_at, updated_at
             FROM story_arcs ORDER BY sort_order, title",
        )
        .map_err(storage)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(StoryArc {
                id: row.get(0)?,
                title: row.get(1)?,
                kind: row.get(2)?,
                summary: row.get(3)?,
                sort_order: row.get(4)?,
                event_ids: Vec::new(),
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(storage)?;
    let mut arcs = rows.collect::<Result<Vec<_>, _>>().map_err(storage)?;
    for arc in &mut arcs {
        arc.event_ids = arc_event_ids(conn, &arc.id)?;
    }
    Ok(arcs)
}

pub fn create_arc(conn: &Connection, input: ArcInput) -> Result<StoryArc, ApiError> {
    let title = require_name(input.title.as_deref().unwrap_or(""))?;
    let kind = require_vocab_label(&input.kind.unwrap_or_else(|| "支线".into()))?;
    let stamp = now();
    let id = new_id();
    let sort_order = next_sort(conn, "story_arcs")?;
    conn.execute(
        "INSERT INTO story_arcs (id, title, kind, summary, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![id, title, kind, input.summary.unwrap_or_default(), sort_order, stamp],
    )
    .map_err(storage)?;
    ensure_label(conn, CAT_ARC_KINDS, &kind)?;
    get_arc(conn, &id)
}

pub fn update_arc(conn: &Connection, id: &str, input: ArcInput) -> Result<StoryArc, ApiError> {
    let current = get_arc(conn, id)?;
    let title = match input.title {
        Some(title) => require_name(&title)?,
        None => current.title,
    };
    let kind = match input.kind {
        Some(k) => require_vocab_label(&k)?,
        None => current.kind,
    };
    let summary = input.summary.unwrap_or(current.summary);
    let changed = conn
        .execute(
            "UPDATE story_arcs SET title = ?1, kind = ?2, summary = ?3, updated_at = ?4 WHERE id = ?5",
            params![title, kind, summary, now(), id],
        )
        .map_err(storage)?;
    if changed == 0 {
        return Err(ApiError::not_found());
    }
    ensure_label(conn, CAT_ARC_KINDS, &kind)?;
    get_arc(conn, id)
}

pub fn delete_arc(conn: &Connection, id: &str) -> Result<String, ApiError> {
    delete_row(conn, "DELETE FROM story_arcs WHERE id = ?1", id)
}

pub fn reorder_arcs(conn: &Connection, ids: &[String]) -> Result<Vec<StoryArc>, ApiError> {
    let existing = list_arcs(conn)?;
    let existing_ids: Vec<String> = existing.iter().map(|arc| arc.id.clone()).collect();
    require_permutation(&existing_ids, ids)?;
    let tx = conn.unchecked_transaction().map_err(storage)?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE story_arcs SET sort_order = ?1 WHERE id = ?2",
            params![index as i64 + 1, id],
        )
        .map_err(storage)?;
    }
    tx.commit().map_err(storage)?;
    list_arcs(conn)
}

pub fn set_arc_events(conn: &Connection, id: &str, event_ids: &[String]) -> Result<StoryArc, ApiError> {
    get_arc(conn, id)?;
    require_unique(event_ids)?;
    for event_id in event_ids {
        get_event(conn, event_id)?;
    }
    let tx = conn.unchecked_transaction().map_err(storage)?;
    tx.execute("DELETE FROM arc_events WHERE arc_id = ?1", [id])
        .map_err(storage)?;
    for (index, event_id) in event_ids.iter().enumerate() {
        tx.execute(
            "INSERT INTO arc_events (arc_id, event_id, sort_order) VALUES (?1, ?2, ?3)",
            params![id, event_id, index as i64 + 1],
        )
        .map_err(storage)?;
    }
    tx.commit().map_err(storage)?;
    get_arc(conn, id)
}

fn get_arc(conn: &Connection, id: &str) -> Result<StoryArc, ApiError> {
    let mut arc = conn
        .query_row(
            "SELECT id, title, kind, summary, sort_order, created_at, updated_at FROM story_arcs WHERE id = ?1",
            [id],
            |row| {
                Ok(StoryArc {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    kind: row.get(2)?,
                    summary: row.get(3)?,
                    sort_order: row.get(4)?,
                    event_ids: Vec::new(),
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .optional()
        .map_err(storage)?
        .ok_or_else(ApiError::not_found)?;
    arc.event_ids = arc_event_ids(conn, id)?;
    Ok(arc)
}

fn arc_event_ids(conn: &Connection, arc_id: &str) -> Result<Vec<String>, ApiError> {
    let mut stmt = conn
        .prepare("SELECT event_id FROM arc_events WHERE arc_id = ?1 ORDER BY sort_order")
        .map_err(storage)?;
    let rows = stmt
        .query_map([arc_id], |row| row.get(0))
        .map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}