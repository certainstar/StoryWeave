//! 项目库快照与路径。

use super::support::{backup_err, storage};
use crate::error::ApiError;
use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};

/// 把项目库复制成一份快照文件。
pub fn backup_to(source: &Connection, dest: &Path) -> Result<(), ApiError> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(storage)?;
    }
    source.backup("main", dest, None).map_err(backup_err)?;
    Ok(())
}

/// 快照目录中最新的一份。目录不存在时返回空。
pub fn latest_snapshot(dir: &Path) -> Option<String> {
    snapshot_names(dir).into_iter().next()
}

/// 快照时间列表，新的在前，最多 10 条。更旧的文件会删掉。
pub fn prune_snapshots(dir: &Path) -> Result<Vec<String>, ApiError> {
    let mut names = snapshot_names(dir);
    if names.len() > 10 {
        for extra in names.drain(10..) {
            let _ = fs::remove_file(dir.join(format!("{extra}.sqlite")));
        }
    }
    Ok(names)
}

fn snapshot_names(dir: &Path) -> Vec<String> {
    let mut names = fs::read_dir(dir)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            name.strip_suffix(".sqlite").map(|value| value.to_string())
        })
        .collect::<Vec<_>>();
    names.sort();
    names.reverse();
    names
}

/// 项目文件所在目录。
pub fn project_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("projects")
}

/// 某个项目的快照目录。
pub fn backup_dir(data_dir: &Path, project_id: &str) -> PathBuf {
    data_dir.join("backups").join(project_id)
}