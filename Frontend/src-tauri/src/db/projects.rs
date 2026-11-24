//! 应用库里的项目记录与项目文件。

use super::backup::backup_dir;
use super::maps::map_project;
use super::support::{new_id, now, storage};
use super::bootstrap::{connect, migrate};
use crate::domain::require_name;
use crate::error::ApiError;
use crate::models::ProjectSummary;
use rusqlite::{params, Connection, OptionalExtension};
use std::fs;
use std::path::{Path, PathBuf};

/// 最近打开的项目，新的在前。
pub fn list_projects(conn: &Connection) -> Result<Vec<ProjectSummary>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, path, updated_at, last_opened_at
             FROM projects ORDER BY last_opened_at DESC",
        )
        .map_err(storage)?;
    let rows = stmt.query_map([], map_project).map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

/// 按 id 取项目摘要。
pub fn get_project(conn: &Connection, id: &str) -> Result<ProjectSummary, ApiError> {
    conn.query_row(
        "SELECT id, name, description, path, updated_at, last_opened_at FROM projects WHERE id = ?1",
        [id],
        map_project,
    )
    .optional()
    .map_err(storage)?
    .ok_or_else(ApiError::not_found)
}

/// 新建项目文件，并记入最近列表。
pub fn create_project(
    app: &Connection,
    dir: &Path,
    name: &str,
    description: &str,
) -> Result<ProjectSummary, ApiError> {
    let name = require_name(name)?;
    let id = new_id();
    let stamp = now();
    fs::create_dir_all(dir).map_err(storage)?;
    let path = dir.join(format!("{id}.sqlite"));
    let project = connect(&path)?;
    migrate(&project)?;
    project
        .execute(
            "INSERT INTO project_meta (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)",
            params![id, name, description.trim(), stamp],
        )
        .map_err(storage)?;
    project
        .execute(
            "INSERT INTO graph_layouts (id, updated_at) VALUES ('default', ?1)",
            [&stamp],
        )
        .map_err(storage)?;
    let summary = ProjectSummary {
        id: id.clone(),
        name,
        description: description.trim().to_string(),
        path: path.display().to_string(),
        updated_at: stamp.clone(),
        last_opened_at: stamp,
    };
    upsert_project(app, &summary)?;
    Ok(summary)
}

/// 更新项目名称或简介。
pub fn update_project(
    app: &Connection,
    project: &Connection,
    id: &str,
    name: Option<&str>,
    description: Option<&str>,
) -> Result<ProjectSummary, ApiError> {
    let mut summary = get_project(app, id)?;
    if let Some(name) = name {
        summary.name = require_name(name)?;
    }
    if let Some(description) = description {
        summary.description = description.trim().to_string();
    }
    let stamp = now();
    summary.updated_at = stamp.clone();
    project
        .execute(
            "UPDATE project_meta SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
            params![summary.name, summary.description, stamp, id],
        )
        .map_err(storage)?;
    upsert_project(app, &summary)?;
    Ok(summary)
}

/// 把项目标成刚刚打开。
pub fn mark_opened(app: &Connection, id: &str) -> Result<ProjectSummary, ApiError> {
    let mut summary = get_project(app, id)?;
    summary.last_opened_at = now();
    upsert_project(app, &summary)?;
    Ok(summary)
}

/// 删除项目记录、项目库和快照目录。
pub fn delete_project(app: &Connection, data_dir: &Path, id: &str) -> Result<(), ApiError> {
    let summary = get_project(app, id)?;
    app.execute("DELETE FROM projects WHERE id = ?1", [id]).map_err(storage)?;
    let path = PathBuf::from(summary.path);
    if path.exists() {
        fs::remove_file(&path).map_err(storage)?;
    }
    let backups = backup_dir(data_dir, id);
    if backups.exists() {
        fs::remove_dir_all(&backups).map_err(storage)?;
    }
    Ok(())
}

fn upsert_project(conn: &Connection, summary: &ProjectSummary) -> Result<(), ApiError> {
    conn.execute(
        "INSERT INTO projects (id, name, description, path, updated_at, last_opened_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            name = ?2, description = ?3, path = ?4, updated_at = ?5, last_opened_at = ?6",
        params![
            summary.id,
            summary.name,
            summary.description,
            summary.path,
            summary.updated_at,
            summary.last_opened_at
        ],
    )
    .map_err(storage)?;
    Ok(())
}