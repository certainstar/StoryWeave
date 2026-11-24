//! 人物档案读写。

use super::maps::map_character;
use super::support::{new_id, now, storage, to_json};
use super::vocab_ext::{ensure_label, CAT_CHARACTER_STATUS};
use crate::domain::{require_name, require_vocab_label};
use crate::error::ApiError;
use super::inputs::CharacterInput;
use crate::models::Character;
use rusqlite::{params, Connection, OptionalExtension};

/// 人物列表，按姓名排序。
pub fn list_characters(conn: &Connection) -> Result<Vec<Character>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, aliases_json, role, appearance, personality, goal, background, notes, status, created_at, updated_at
             FROM characters ORDER BY name",
        )
        .map_err(storage)?;
    let rows = stmt.query_map([], map_character).map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

/// 新增人物。
pub fn create_character(conn: &Connection, input: CharacterInput) -> Result<Character, ApiError> {
    let name = require_name(input.name.as_deref().unwrap_or(""))?;
    let status = require_vocab_label(&input.status.unwrap_or_else(|| "在场".into()))?;
    let stamp = now();
    let character = Character {
        id: new_id(),
        name,
        aliases: input.aliases.unwrap_or_default(),
        role: input.role.unwrap_or_default(),
        appearance: input.appearance.unwrap_or_default(),
        personality: input.personality.unwrap_or_default(),
        goal: input.goal.unwrap_or_default(),
        background: input.background.unwrap_or_default(),
        notes: input.notes.unwrap_or_default(),
        status,
        created_at: stamp.clone(),
        updated_at: stamp,
    };
    save_character(conn, &character)?;
    ensure_label(conn, CAT_CHARACTER_STATUS, &character.status)?;
    Ok(character)
}

/// 修改人物。
pub fn update_character(conn: &Connection, id: &str, input: CharacterInput) -> Result<Character, ApiError> {
    let mut character = get_character(conn, id)?;
    if let Some(name) = input.name {
        character.name = require_name(&name)?;
    }
    if let Some(aliases) = input.aliases {
        character.aliases = aliases;
    }
    if let Some(role) = input.role {
        character.role = role;
    }
    if let Some(appearance) = input.appearance {
        character.appearance = appearance;
    }
    if let Some(personality) = input.personality {
        character.personality = personality;
    }
    if let Some(goal) = input.goal {
        character.goal = goal;
    }
    if let Some(background) = input.background {
        character.background = background;
    }
    if let Some(notes) = input.notes {
        character.notes = notes;
    }
    if let Some(status) = input.status {
        character.status = require_vocab_label(&status)?;
    }
    character.updated_at = now();
    save_character(conn, &character)?;
    ensure_label(conn, CAT_CHARACTER_STATUS, &character.status)?;
    Ok(character)
}

/// 删除人物。
pub fn delete_character(conn: &Connection, id: &str) -> Result<String, ApiError> {
    let changed = conn
        .execute("DELETE FROM characters WHERE id = ?1", [id])
        .map_err(storage)?;
    if changed == 0 {
        return Err(ApiError::not_found());
    }
    Ok(id.to_string())
}

fn get_character(conn: &Connection, id: &str) -> Result<Character, ApiError> {
    conn.query_row(
        "SELECT id, name, aliases_json, role, appearance, personality, goal, background, notes, status, created_at, updated_at
         FROM characters WHERE id = ?1",
        [id],
        map_character,
    )
    .optional()
    .map_err(storage)?
    .ok_or_else(ApiError::not_found)
}

fn save_character(conn: &Connection, character: &Character) -> Result<(), ApiError> {
    conn.execute(
        "INSERT INTO characters (id, name, aliases_json, role, appearance, personality, goal, background, notes, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
         ON CONFLICT(id) DO UPDATE SET
            name = ?2, aliases_json = ?3, role = ?4, appearance = ?5, personality = ?6,
            goal = ?7, background = ?8, notes = ?9, status = ?10, updated_at = ?12",
        params![
            character.id,
            character.name,
            to_json(&character.aliases),
            character.role,
            character.appearance,
            character.personality,
            character.goal,
            character.background,
            character.notes,
            character.status,
            character.created_at,
            character.updated_at
        ],
    )
    .map_err(storage)?;
    Ok(())
}