//! 应用库与项目库共用的底层读写。

use crate::error::ApiError;
use crate::models::{GraphLayout, Viewport};
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::BTreeMap;

pub(crate) fn preference(conn: &Connection, key: &str) -> Result<String, ApiError> {
    conn.query_row("SELECT value FROM preferences WHERE key = ?1", [key], |row| row.get(0))
        .optional()
        .map_err(storage)?
        .ok_or_else(ApiError::storage)
}

pub(crate) fn set_preference(conn: &Connection, key: &str, value: &str) -> Result<(), ApiError> {
    conn.execute(
        "INSERT INTO preferences (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = ?2",
        params![key, value],
    )
    .map_err(storage)?;
    Ok(())
}

pub(crate) fn empty_layout() -> GraphLayout {
    GraphLayout {
        viewport: Viewport {
            x: 0.0,
            y: 0.0,
            zoom: 1.0,
        },
        nodes: BTreeMap::new(),
        updated_at: now(),
    }
}

pub(crate) fn blank_to_null(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

pub(crate) fn json_vec(text: &str) -> Vec<String> {
    serde_json::from_str(text).unwrap_or_default()
}

pub(crate) fn to_json(values: &[String]) -> String {
    serde_json::to_string(values).unwrap_or_else(|_| "[]".into())
}

pub(crate) fn new_id() -> String {
    ulid::Ulid::new().to_string()
}

pub(crate) fn now() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

pub(crate) fn storage<E: std::fmt::Display>(err: E) -> ApiError {
    eprintln!("storage: {err}");
    ApiError::storage()
}

pub(crate) fn migration<E: std::fmt::Display>(err: E) -> ApiError {
    eprintln!("migration: {err}");
    ApiError::migration()
}

pub(crate) fn backup_err<E: std::fmt::Display>(err: E) -> ApiError {
    eprintln!("backup: {err}");
    ApiError::backup()
}

/// 读取某张有序表的下一个 `sort_order`。
pub(crate) fn next_sort(conn: &Connection, table: &str) -> Result<i64, ApiError> {
    let allowed = ["events", "story_arcs", "chapters"];
    if !allowed.contains(&table) {
        return Err(ApiError::storage());
    }
    conn.query_row(
        &format!("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {table}"),
        [],
        |row| row.get(0),
    )
    .map_err(storage)
}