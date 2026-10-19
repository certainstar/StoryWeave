//! 命令的输入和输出。字段名在 JSON 里是驼峰。

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// 人物档案。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Character {
    pub id: String,
    pub name: String,
    pub aliases: Vec<String>,
    pub role: String,
    pub appearance: String,
    pub personality: String,
    pub goal: String,
    pub background: String,
    pub notes: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

/// 两个人物之间的一条关系。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Relation {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub r#type: String,
    pub description: String,
    pub directional: bool,
    pub span: String,
    pub created_at: String,
    pub updated_at: String,
}

/// 事件里的一个参与者。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventParticipant {
    pub character_id: String,
    pub role: String,
}

/// 故事事件。`sort_order` 是故事内顺序，不解析 `story_time`。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryEvent {
    pub id: String,
    pub title: String,
    pub description: String,
    pub story_time: Option<String>,
    pub sort_order: i64,
    pub participants: Vec<EventParticipant>,
    pub created_at: String,
    pub updated_at: String,
}

/// 故事线。`event_ids` 的顺序只属于这一条线。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryArc {
    pub id: String,
    pub title: String,
    pub kind: String,
    pub summary: String,
    pub sort_order: i64,
    pub event_ids: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 章节。`content` 是 Markdown 原文。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Chapter {
    pub id: String,
    pub title: String,
    pub status: String,
    pub summary: String,
    pub content: String,
    pub sort_order: i64,
    pub character_ids: Vec<String>,
    pub event_ids: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 章节下的场景。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Scene {
    pub id: String,
    pub chapter_id: String,
    pub title: String,
    pub summary: String,
    pub story_time: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// 笔记。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 图谱视口。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Viewport {
    pub x: f64,
    pub y: f64,
    pub zoom: f64,
}

/// 一个节点的坐标。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodePos {
    pub x: f64,
    pub y: f64,
}

/// 图谱布局。坐标不属于人物档案。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphLayout {
    pub viewport: Viewport,
    pub nodes: BTreeMap<String, NodePos>,
    pub updated_at: String,
}

/// 最近项目列表里的一条。`path` 是作者要找的项目文件。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
    pub description: String,
    pub path: String,
    pub updated_at: String,
    pub last_opened_at: String,
}

/// 搜索结果里的一条。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub kind: String,
    pub id: String,
    pub title: String,
}

/// 一份快照。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub snapshot_at: String,
    pub path: String,
}

/// 上次退出不完整时，界面用来询问是否恢复。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Recovery {
    pub needed: bool,
    /// 要恢复的项目。没有可恢复的快照时为空。
    pub project_id: Option<String>,
    pub snapshot_at: Option<String>,
}

/// 应用启动时界面需要的状态。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStateDto {
    pub theme: String,
    pub recent: Vec<ProjectSummary>,
    pub recovery: Recovery,
}

/// 删除成功。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Deleted {
    pub deleted_id: String,
}

/// 关闭项目成功。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Closed {
    pub closed: bool,
}

/// 主题保存结果。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeSet {
    pub theme: String,
}
