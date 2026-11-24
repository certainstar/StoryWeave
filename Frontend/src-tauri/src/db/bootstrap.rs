//! 打开连接与结构迁移。

use super::support::{migration, now, storage};
use crate::error::ApiError;
use rusqlite::{params, Connection};
use std::path::Path;

const SCHEMA: &str = include_str!("schema.sql");

/// 打开数据库并开启外键。
pub fn connect(path: &Path) -> Result<Connection, ApiError> {
    let conn = Connection::open(path).map_err(storage)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(storage)?;
    Ok(conn)
}

/// 把项目库补到当前结构。可以重复调用。
pub fn migrate(conn: &Connection) -> Result<(), ApiError> {
    conn.execute_batch(SCHEMA).map_err(migration)?;
    let version: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .map_err(migration)?;
    if version < 1 {
        conn.execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?1)",
            [now()],
        )
        .map_err(migration)?;
    }
    let version: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .map_err(migration)?;
    if version < 2 {
        let mut has_sort = false;
        let mut info = conn.prepare("PRAGMA table_info(notes)").map_err(migration)?;
        let columns = info
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(migration)?;
        for name in columns {
            if name.map_err(migration)? == "sort_order" {
                has_sort = true;
                break;
            }
        }
        if !has_sort {
            conn.execute(
                "ALTER TABLE notes ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
                [],
            )
            .map_err(migration)?;
        }
        let mut stmt = conn
            .prepare("SELECT id FROM notes ORDER BY updated_at DESC")
            .map_err(migration)?;
        let ids: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(migration)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(migration)?;
        for (index, id) in ids.iter().enumerate() {
            conn.execute(
                "UPDATE notes SET sort_order = ?1 WHERE id = ?2",
                params![index as i64 + 1, id],
            )
            .map_err(migration)?;
        }
        conn.execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (2, ?1)",
            [now()],
        )
        .map_err(migration)?;
    }
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_notes_sort ON notes(sort_order)",
        [],
    )
    .map_err(migration)?;
    let version: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .map_err(migration)?;
    if version < 3 {
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS project_vocab (
                category TEXT NOT NULL,
                label TEXT NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (category, label)
            );
            CREATE TABLE characters_v3 (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                aliases_json TEXT NOT NULL DEFAULT '[]',
                role TEXT NOT NULL DEFAULT '',
                appearance TEXT NOT NULL DEFAULT '',
                personality TEXT NOT NULL DEFAULT '',
                goal TEXT NOT NULL DEFAULT '',
                background TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT '在场',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO characters_v3 SELECT id, name, aliases_json, role, appearance, personality, goal, background, notes, status, created_at, updated_at FROM characters;
            DROP TABLE characters;
            ALTER TABLE characters_v3 RENAME TO characters;
            CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);

            CREATE TABLE relations_v3 (
                id TEXT PRIMARY KEY,
                source_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                type TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                is_directional INTEGER NOT NULL DEFAULT 1,
                span TEXT NOT NULL DEFAULT '待定',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                CHECK (source_id <> target_id),
                FOREIGN KEY (source_id) REFERENCES characters(id) ON DELETE CASCADE,
                FOREIGN KEY (target_id) REFERENCES characters(id) ON DELETE CASCADE
            );
            INSERT INTO relations_v3 SELECT id, source_id, target_id, type, description, is_directional, span, created_at, updated_at FROM relations;
            DROP TABLE relations;
            ALTER TABLE relations_v3 RENAME TO relations;
            CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
            CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);

            CREATE TABLE story_arcs_v3 (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                kind TEXT NOT NULL DEFAULT '支线',
                summary TEXT NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO story_arcs_v3 SELECT id, title, kind, summary, sort_order, created_at, updated_at FROM story_arcs;
            DROP TABLE story_arcs;
            ALTER TABLE story_arcs_v3 RENAME TO story_arcs;

            CREATE TABLE chapters_v3 (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT '构思中',
                summary TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO chapters_v3 SELECT id, title, status, summary, content, sort_order, created_at, updated_at FROM chapters;
            DROP TABLE chapters;
            ALTER TABLE chapters_v3 RENAME TO chapters;
            CREATE INDEX IF NOT EXISTS idx_chapters_sort ON chapters(sort_order);
            "#,
        )
        .map_err(migration)?;
        conn.execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (3, ?1)",
            [now()],
        )
        .map_err(migration)?;
    }
    Ok(())
}

/// 初始化应用库。
pub fn migrate_app(conn: &Connection) -> Result<(), ApiError> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS preferences (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            path TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_opened_at TEXT NOT NULL
        );
        ",
    )
    .map_err(storage)?;
    conn.execute(
        "INSERT OR IGNORE INTO preferences (key, value) VALUES ('theme', 'paper'), ('clean_exit', '1'), ('recovery_skip', ''), ('leave_draft', 'autosave')",
        [],
    )
    .map_err(storage)?;
    Ok(())
}