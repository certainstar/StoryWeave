//! 各实体写入时的可选字段。

use crate::models::EventParticipant;

/// 人物写入用的可选字段。
#[derive(Debug, Default)]
pub struct CharacterInput {
    pub name: Option<String>,
    pub aliases: Option<Vec<String>>,
    pub role: Option<String>,
    pub appearance: Option<String>,
    pub personality: Option<String>,
    pub goal: Option<String>,
    pub background: Option<String>,
    pub notes: Option<String>,
    pub status: Option<String>,
}

/// 关系写入用的可选字段。
#[derive(Debug, Default)]
pub struct RelationInput {
    pub source_id: Option<String>,
    pub target_id: Option<String>,
    pub r#type: Option<String>,
    pub description: Option<String>,
    pub directional: Option<bool>,
    pub span: Option<String>,
}

/// 事件写入用的可选字段。
#[derive(Debug, Default)]
pub struct EventInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub story_time: Option<String>,
    pub participants: Option<Vec<EventParticipant>>,
}

/// 故事线写入用的可选字段。
#[derive(Debug, Default)]
pub struct ArcInput {
    pub title: Option<String>,
    pub kind: Option<String>,
    pub summary: Option<String>,
}

/// 章节写入用的可选字段。
#[derive(Debug, Default)]
pub struct ChapterInput {
    pub title: Option<String>,
    pub status: Option<String>,
    pub summary: Option<String>,
    pub content: Option<String>,
    pub character_ids: Option<Vec<String>>,
    pub event_ids: Option<Vec<String>>,
}

/// 场景写入用的可选字段。
#[derive(Debug, Default)]
pub struct SceneInput {
    pub chapter_id: Option<String>,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub story_time: Option<String>,
}

/// 笔记写入用的可选字段。
#[derive(Debug, Default)]
pub struct NoteInput {
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
}