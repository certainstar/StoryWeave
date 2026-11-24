//! 故事事件读写。

use super::guards::{delete_row, require_character};
use super::inputs::EventInput;
use super::support::{blank_to_null, new_id, next_sort, now, storage};
use crate::domain::{require_name, require_permutation, require_unique};
use crate::error::ApiError;
use crate::models::{EventParticipant, StoryEvent};
use rusqlite::{params, Connection, OptionalExtension};

/// 事件列表，按故事内顺序。
pub fn list_events(conn: &Connection) -> Result<Vec<StoryEvent>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, story_time, sort_order, created_at, updated_at
             FROM events ORDER BY sort_order, title",
        )
        .map_err(storage)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(StoryEvent {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                story_time: row.get(3)?,
                sort_order: row.get(4)?,
                participants: Vec::new(),
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(storage)?;
    let mut events = rows.collect::<Result<Vec<_>, _>>().map_err(storage)?;
    for event in &mut events {
        event.participants = participants(conn, &event.id)?;
    }
    Ok(events)
}

/// 新增事件，排在当前顺序的末尾。
pub fn create_event(conn: &Connection, input: EventInput) -> Result<StoryEvent, ApiError> {
    let title = require_name(input.title.as_deref().unwrap_or(""))?;
    let people = input.participants.unwrap_or_default();
    ensure_characters(conn, &people)?;
    let sort_order = next_sort(conn, "events")?;
    let stamp = now();
    let id = new_id();
    let tx = conn.unchecked_transaction().map_err(storage)?;
    tx.execute(
        "INSERT INTO events (id, title, description, story_time, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![
            id,
            title,
            input.description.unwrap_or_default(),
            blank_to_null(input.story_time),
            sort_order,
            stamp
        ],
    )
    .map_err(storage)?;
    replace_participants(&tx, &id, &people)?;
    tx.commit().map_err(storage)?;
    get_event(conn, &id)
}

/// 修改事件。
pub fn update_event(conn: &Connection, id: &str, input: EventInput) -> Result<StoryEvent, ApiError> {
    let current = get_event(conn, id)?;
    let title = match input.title {
        Some(title) => require_name(&title)?,
        None => current.title,
    };
    let description = input.description.unwrap_or(current.description);
    let story_time = match input.story_time {
        Some(value) => blank_to_null(Some(value)),
        None => current.story_time,
    };
    let people = input.participants.unwrap_or(current.participants);
    ensure_characters(conn, &people)?;
    let stamp = now();
    let tx = conn.unchecked_transaction().map_err(storage)?;
    let changed = tx
        .execute(
            "UPDATE events SET title = ?1, description = ?2, story_time = ?3, updated_at = ?4 WHERE id = ?5",
            params![title, description, story_time, stamp, id],
        )
        .map_err(storage)?;
    if changed == 0 {
        return Err(ApiError::not_found());
    }
    replace_participants(&tx, id, &people)?;
    tx.commit().map_err(storage)?;
    get_event(conn, id)
}

/// 删除事件。
pub fn delete_event(conn: &Connection, id: &str) -> Result<String, ApiError> {
    delete_row(conn, "DELETE FROM events WHERE id = ?1", id)
}

/// 重排事件。
pub fn reorder_events(conn: &Connection, ids: &[String]) -> Result<Vec<StoryEvent>, ApiError> {
    let existing = list_events(conn)?;
    let existing_ids: Vec<String> = existing.iter().map(|event| event.id.clone()).collect();
    require_permutation(&existing_ids, ids)?;
    let tx = conn.unchecked_transaction().map_err(storage)?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE events SET sort_order = ?1 WHERE id = ?2",
            params![index as i64 + 1, id],
        )
        .map_err(storage)?;
    }
    tx.commit().map_err(storage)?;
    list_events(conn)
}

/// 按 id 读取事件。其它模块校验引用时用。
pub(crate) fn get_event(conn: &Connection, id: &str) -> Result<StoryEvent, ApiError> {
    let mut event = conn
        .query_row(
            "SELECT id, title, description, story_time, sort_order, created_at, updated_at FROM events WHERE id = ?1",
            [id],
            |row| {
                Ok(StoryEvent {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    story_time: row.get(3)?,
                    sort_order: row.get(4)?,
                    participants: Vec::new(),
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .optional()
        .map_err(storage)?
        .ok_or_else(ApiError::not_found)?;
    event.participants = participants(conn, id)?;
    Ok(event)
}

fn participants(conn: &Connection, event_id: &str) -> Result<Vec<EventParticipant>, ApiError> {
    let mut stmt = conn
        .prepare("SELECT character_id, role FROM event_participants WHERE event_id = ?1 ORDER BY character_id")
        .map_err(storage)?;
    let rows = stmt
        .query_map([event_id], |row| {
            Ok(EventParticipant {
                character_id: row.get(0)?,
                role: row.get(1)?,
            })
        })
        .map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

fn replace_participants(conn: &Connection, event_id: &str, people: &[EventParticipant]) -> Result<(), ApiError> {
    let ids: Vec<String> = people.iter().map(|person| person.character_id.clone()).collect();
    require_unique(&ids)?;
    conn.execute("DELETE FROM event_participants WHERE event_id = ?1", [event_id])
        .map_err(storage)?;
    for person in people {
        conn.execute(
            "INSERT INTO event_participants (event_id, character_id, role) VALUES (?1, ?2, ?3)",
            params![event_id, person.character_id, person.role],
        )
        .map_err(storage)?;
    }
    Ok(())
}

fn ensure_characters(conn: &Connection, people: &[EventParticipant]) -> Result<(), ApiError> {
    for person in people {
        require_character(conn, &person.character_id)?;
    }
    Ok(())
}