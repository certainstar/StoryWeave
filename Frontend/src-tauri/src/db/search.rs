//! 跨实体全文检索。

use super::support::storage;
use crate::error::ApiError;
use crate::models::SearchHit;
use rusqlite::Connection;

/// 在人物、事件、故事线、章节和笔记里查找包含 `query` 的记录。
pub fn search(conn: &Connection, query: &str) -> Result<Vec<SearchHit>, ApiError> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let mut hits = Vec::new();
    push_hits(
        conn,
        &mut hits,
        "character",
        "SELECT id, name FROM characters WHERE instr(lower(name), lower(?1)) > 0 OR instr(lower(aliases_json), lower(?1)) > 0",
        query,
    )?;
    push_hits(
        conn,
        &mut hits,
        "event",
        "SELECT id, title FROM events WHERE instr(lower(title), lower(?1)) > 0 OR instr(lower(description), lower(?1)) > 0 OR instr(lower(COALESCE(story_time, '')), lower(?1)) > 0",
        query,
    )?;
    push_hits(
        conn,
        &mut hits,
        "arc",
        "SELECT id, title FROM story_arcs WHERE instr(lower(title), lower(?1)) > 0 OR instr(lower(summary), lower(?1)) > 0",
        query,
    )?;
    push_hits(
        conn,
        &mut hits,
        "chapter",
        "SELECT id, title FROM chapters WHERE instr(lower(title), lower(?1)) > 0 OR instr(lower(summary), lower(?1)) > 0 OR instr(lower(content), lower(?1)) > 0",
        query,
    )?;
    push_hits(
        conn,
        &mut hits,
        "note",
        "SELECT id, title FROM notes WHERE instr(lower(title), lower(?1)) > 0 OR instr(lower(content), lower(?1)) > 0 OR instr(lower(tags_json), lower(?1)) > 0",
        query,
    )?;
    Ok(hits)
}

fn push_hits(
    conn: &Connection,
    hits: &mut Vec<SearchHit>,
    kind: &str,
    sql: &str,
    query: &str,
) -> Result<(), ApiError> {
    let mut stmt = conn.prepare(sql).map_err(storage)?;
    let rows = stmt
        .query_map([query], |row| {
            Ok(SearchHit {
                kind: kind.to_string(),
                id: row.get(0)?,
                title: row.get(1)?,
            })
        })
        .map_err(storage)?;
    for row in rows {
        hits.push(row.map_err(storage)?);
    }
    Ok(())
}