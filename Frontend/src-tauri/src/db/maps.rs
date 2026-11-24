//! 行映射。

use crate::models::*;
use super::support::json_vec;

pub(crate) fn map_project(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProjectSummary> {
    Ok(ProjectSummary {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        path: row.get(3)?,
        updated_at: row.get(4)?,
        last_opened_at: row.get(5)?,
    })
}

pub(crate) fn map_character(row: &rusqlite::Row<'_>) -> rusqlite::Result<Character> {
    let aliases: String = row.get(2)?;
    Ok(Character {
        id: row.get(0)?,
        name: row.get(1)?,
        aliases: json_vec(&aliases),
        role: row.get(3)?,
        appearance: row.get(4)?,
        personality: row.get(5)?,
        goal: row.get(6)?,
        background: row.get(7)?,
        notes: row.get(8)?,
        status: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

pub(crate) fn map_relation(row: &rusqlite::Row<'_>) -> rusqlite::Result<Relation> {
    let directional: i64 = row.get(5)?;
    Ok(Relation {
        id: row.get(0)?,
        source_id: row.get(1)?,
        target_id: row.get(2)?,
        r#type: row.get(3)?,
        description: row.get(4)?,
        directional: directional != 0,
        span: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

pub(crate) fn map_scene(row: &rusqlite::Row<'_>) -> rusqlite::Result<Scene> {
    Ok(Scene {
        id: row.get(0)?,
        chapter_id: row.get(1)?,
        title: row.get(2)?,
        summary: row.get(3)?,
        story_time: row.get(4)?,
        sort_order: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

pub(crate) fn map_note(row: &rusqlite::Row<'_>) -> rusqlite::Result<Note> {
    let tags: String = row.get(3)?;
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        tags: json_vec(&tags),
        sort_order: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}