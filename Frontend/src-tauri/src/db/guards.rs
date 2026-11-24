//! 外键与删除前的存在性检查。

use super::support::storage;
use crate::error::ApiError;
use rusqlite::{params, Connection, OptionalExtension};

pub(crate) fn require_distinct_pair(source_id: &str, target_id: &str) -> Result<(), ApiError> {
    crate::domain::require_distinct(source_id, target_id)
}

pub(crate) fn require_character(conn: &Connection, id: &str) -> Result<(), ApiError> {
    let found = conn
        .query_row("SELECT 1 FROM characters WHERE id = ?1", [id], |row| row.get::<_, i64>(0))
        .optional()
        .map_err(storage)?;
    if found.is_some() {
        Ok(())
    } else {
        Err(ApiError::not_found())
    }
}

pub(crate) fn delete_row(conn: &Connection, sql: &str, id: &str) -> Result<String, ApiError> {
    let changed = conn.execute(sql, params![id]).map_err(storage)?;
    if changed == 0 {
        return Err(ApiError::not_found());
    }
    Ok(id.to_string())
}