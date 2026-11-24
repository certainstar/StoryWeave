//! 项目级自定义词表（每个项目库一份）。

use super::support::storage;
use crate::domain::require_vocab_label;
use crate::error::ApiError;
use crate::models::VocabDto;
use crate::vocab;
use rusqlite::{params, Connection};
use std::collections::HashSet;

pub const CAT_CHARACTER_STATUS: &str = "character_status";
pub const CAT_RELATION_TYPES: &str = "relation_types";
pub const CAT_RELATION_SPANS: &str = "relation_spans";
pub const CAT_ARC_KINDS: &str = "arc_kinds";
pub const CAT_CHAPTER_STATUS: &str = "chapter_status";

fn is_known_category(category: &str) -> bool {
    matches!(
        category,
        CAT_CHARACTER_STATUS
            | CAT_RELATION_TYPES
            | CAT_RELATION_SPANS
            | CAT_ARC_KINDS
            | CAT_CHAPTER_STATUS
    )
}

fn labels_for_category(conn: &Connection, category: &str) -> Result<Vec<String>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT label FROM project_vocab WHERE category = ?1 ORDER BY sort_order ASC, label ASC",
        )
        .map_err(storage)?;
    let rows = stmt
        .query_map([category], |row| row.get::<_, String>(0))
        .map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

fn merge_labels(custom: Vec<String>, presets: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for label in custom {
        if seen.insert(label.clone()) {
            out.push(label);
        }
    }
    for label in presets {
        if seen.insert(label.clone()) {
            out.push(label);
        }
    }
    out
}

/// 合并预设与本项目自定义词表。
pub fn list_vocab(conn: &Connection) -> Result<VocabDto, ApiError> {
    let base = vocab::list();
    Ok(VocabDto {
        character_status: merge_labels(
            labels_for_category(conn, CAT_CHARACTER_STATUS)?,
            base.character_status,
        ),
        relation_types: merge_labels(
            labels_for_category(conn, CAT_RELATION_TYPES)?,
            base.relation_types,
        ),
        relation_spans: merge_labels(
            labels_for_category(conn, CAT_RELATION_SPANS)?,
            base.relation_spans,
        ),
        arc_kinds: merge_labels(labels_for_category(conn, CAT_ARC_KINDS)?, base.arc_kinds),
        chapter_status: merge_labels(
            labels_for_category(conn, CAT_CHAPTER_STATUS)?,
            base.chapter_status,
        ),
    })
}

/// 若标签不在全局预设中，写入项目词表（靠前排序）。
pub fn ensure_label(conn: &Connection, category: &str, label: &str) -> Result<(), ApiError> {
    if !is_known_category(category) {
        return Err(ApiError::validation(
            "UNKNOWN_CATEGORY",
            "不识别的词表类型。",
        ));
    }
    let label = require_vocab_label(label)?;
    if vocab::is_preset(category, &label) {
        return Ok(());
    }
    let next_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MIN(sort_order), 0) - 1 FROM project_vocab WHERE category = ?1",
            [category],
            |row| row.get(0),
        )
        .unwrap_or(-1);
    conn.execute(
        "INSERT OR IGNORE INTO project_vocab (category, label, sort_order) VALUES (?1, ?2, ?3)",
        params![category, label, next_order],
    )
    .map_err(storage)?;
    Ok(())
}