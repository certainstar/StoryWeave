//! 应用偏好：主题、退出恢复、离开草稿策略。

use super::support::{preference, set_preference};
use crate::error::ApiError;
use rusqlite::Connection;

const THEME_IDS: &[&str] = &["paper", "ink", "fourgentlemen", "mountain", "dragon"];

fn migrate_theme(value: &str) -> &'static str {
    match value {
        "bamboo" | "plum" | "orchid" | "chrysanthemum" => "fourgentlemen",
        v if THEME_IDS.contains(&v) => {
            // SAFETY: only values from THEME_IDS are returned
            match v {
                "paper" => "paper",
                "ink" => "ink",
                "fourgentlemen" => "fourgentlemen",
                "mountain" => "mountain",
                "dragon" => "dragon",
                _ => "paper",
            }
        }
        _ => "paper",
    }
}

fn normalize_theme(value: &str) -> String {
    migrate_theme(value).into()
}

/// 读取主题。缺省为宣纸。
pub fn theme(conn: &Connection) -> Result<String, ApiError> {
    preference(conn, "theme").map(|value| normalize_theme(&value))
}

/// 保存主题。标识见 `THEME_IDS`。
pub fn set_theme(conn: &Connection, value: &str) -> Result<String, ApiError> {
    let mapped = migrate_theme(value);
    if !THEME_IDS.contains(&mapped) {
        return Err(ApiError::validation("UNKNOWN_STATUS", "请选择列表中的主题。"));
    }
    set_preference(conn, "theme", mapped)?;
    Ok(mapped.to_string())
}

/// 读取离开页面时的草稿策略。
pub fn leave_draft(conn: &Connection) -> Result<String, ApiError> {
    preference(conn, "leave_draft").or_else(|_| Ok("autosave".into()))
}

/// 保存离开页面时的草稿策略。
pub fn set_leave_draft(conn: &Connection, value: &str) -> Result<String, ApiError> {
    if value != "autosave" && value != "prompt" && value != "ignore" {
        return Err(ApiError::validation("UNKNOWN_STATUS", "选择自动保存、询问或忽略。"));
    }
    set_preference(conn, "leave_draft", value)?;
    Ok(value.to_string())
}

/// 启动时记下上次是否正常退出，并把本次标记为尚未退出。
pub fn begin_session(conn: &Connection) -> Result<bool, ApiError> {
    let clean = preference(conn, "clean_exit")? == "1";
    set_preference(conn, "clean_exit", "0")?;
    Ok(clean)
}

/// 正常退出时调用。
pub fn mark_clean(conn: &Connection) -> Result<(), ApiError> {
    set_preference(conn, "clean_exit", "1")
}

/// 作者拒绝恢复同一份快照后，不再为它重复询问。
pub fn skip_recovery(conn: &Connection, token: &str) -> Result<(), ApiError> {
    set_preference(conn, "recovery_skip", token)
}

/// 上次跳过的恢复标记。
pub fn recovery_skip(conn: &Connection) -> Result<String, ApiError> {
    preference(conn, "recovery_skip")
}