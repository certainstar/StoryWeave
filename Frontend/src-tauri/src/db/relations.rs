//! 人物关系读写。

use super::guards::{delete_row, require_character, require_distinct_pair};
use super::inputs::RelationInput;
use super::maps::map_relation;
use super::support::{new_id, now, storage};
use super::vocab_ext::{ensure_label, CAT_RELATION_SPANS, CAT_RELATION_TYPES};
use crate::domain::require_vocab_label;
use crate::error::ApiError;
use crate::models::Relation;
use rusqlite::{params, Connection, OptionalExtension};

/// 关系列表。
pub fn list_relations(conn: &Connection) -> Result<Vec<Relation>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, source_id, target_id, type, description, is_directional, span, created_at, updated_at
             FROM relations ORDER BY created_at",
        )
        .map_err(storage)?;
    let rows = stmt.query_map([], map_relation).map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

/// 建立关系。
pub fn create_relation(conn: &Connection, input: RelationInput) -> Result<Relation, ApiError> {
    let source_id = input.source_id.clone().unwrap_or_default();
    let target_id = input.target_id.clone().unwrap_or_default();
    require_distinct_pair(&source_id, &target_id)?;
    require_character(conn, &source_id)?;
    require_character(conn, &target_id)?;
    let kind = require_vocab_label(&input.r#type.unwrap_or_else(|| "待定".into()))?;
    let span = require_vocab_label(&input.span.unwrap_or_else(|| "待定".into()))?;
    let stamp = now();
    let relation = Relation {
        id: new_id(),
        source_id,
        target_id,
        r#type: kind,
        description: input.description.unwrap_or_default(),
        directional: input.directional.unwrap_or(true),
        span,
        created_at: stamp.clone(),
        updated_at: stamp,
    };
    save_relation(conn, &relation)?;
    ensure_label(conn, CAT_RELATION_TYPES, &relation.r#type)?;
    ensure_label(conn, CAT_RELATION_SPANS, &relation.span)?;
    Ok(relation)
}

/// 修改关系。
pub fn update_relation(conn: &Connection, id: &str, input: RelationInput) -> Result<Relation, ApiError> {
    let mut relation = get_relation(conn, id)?;
    if let Some(source_id) = input.source_id {
        relation.source_id = source_id;
    }
    if let Some(target_id) = input.target_id {
        relation.target_id = target_id;
    }
    require_distinct_pair(&relation.source_id, &relation.target_id)?;
    require_character(conn, &relation.source_id)?;
    require_character(conn, &relation.target_id)?;
    if let Some(kind) = input.r#type {
        relation.r#type = require_vocab_label(&kind)?;
    }
    if let Some(description) = input.description {
        relation.description = description;
    }
    if let Some(directional) = input.directional {
        relation.directional = directional;
    }
    if let Some(span) = input.span {
        relation.span = require_vocab_label(&span)?;
    }
    relation.updated_at = now();
    save_relation(conn, &relation)?;
    ensure_label(conn, CAT_RELATION_TYPES, &relation.r#type)?;
    ensure_label(conn, CAT_RELATION_SPANS, &relation.span)?;
    Ok(relation)
}

/// 删除一条关系。
pub fn delete_relation(conn: &Connection, id: &str) -> Result<String, ApiError> {
    delete_row(conn, "DELETE FROM relations WHERE id = ?1", id)
}

fn get_relation(conn: &Connection, id: &str) -> Result<Relation, ApiError> {
    conn.query_row(
        "SELECT id, source_id, target_id, type, description, is_directional, span, created_at, updated_at
         FROM relations WHERE id = ?1",
        [id],
        map_relation,
    )
    .optional()
    .map_err(storage)?
    .ok_or_else(ApiError::not_found)
}

fn save_relation(conn: &Connection, relation: &Relation) -> Result<(), ApiError> {
    conn.execute(
        "INSERT INTO relations (id, source_id, target_id, type, description, is_directional, span, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(id) DO UPDATE SET
            source_id = ?2, target_id = ?3, type = ?4, description = ?5,
            is_directional = ?6, span = ?7, updated_at = ?9",
        params![
            relation.id,
            relation.source_id,
            relation.target_id,
            relation.r#type,
            relation.description,
            relation.directional as i64,
            relation.span,
            relation.created_at,
            relation.updated_at
        ],
    )
    .map_err(storage)?;
    Ok(())
}