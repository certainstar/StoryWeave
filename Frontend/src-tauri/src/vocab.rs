//! 下拉词表。校验与 `vocab_list` 共用这一份列表。

use crate::models::VocabDto;

pub const CHARACTER_STATUS: &[&str] = &["在场", "场外", "下落不明", "已故", "暗处", "虚拟", "待定"];
pub const RELATION_TYPES: &[&str] = &[
    "家人", "师徒", "暗恋", "明恋", "合作", "仇敌", "利用", "同门", "旧识", "心结", "恩怨", "伴侣", "待定",
];
pub const RELATION_SPANS: &[&str] = &["当前", "过去", "未来", "待定"];
pub const ARC_KINDS: &[&str] = &["主线", "支线", "人物线", "感情线", "待定"];
pub const CHAPTER_STATUS: &[&str] = &["构思中", "草稿", "修订中", "完成", "待定"];

/// 标签是否属于全局预设（不含项目自定义）。
pub fn is_preset(category: &str, label: &str) -> bool {
    let allowed: &[&str] = match category {
        "character_status" => CHARACTER_STATUS,
        "relation_types" => RELATION_TYPES,
        "relation_spans" => RELATION_SPANS,
        "arc_kinds" => ARC_KINDS,
        "chapter_status" => CHAPTER_STATUS,
        _ => return false,
    };
    allowed.contains(&label)
}

/// 返回界面下拉使用的全部词表。
pub fn list() -> VocabDto {
    VocabDto {
        character_status: CHARACTER_STATUS.iter().map(|s| (*s).to_string()).collect(),
        relation_types: RELATION_TYPES.iter().map(|s| (*s).to_string()).collect(),
        relation_spans: RELATION_SPANS.iter().map(|s| (*s).to_string()).collect(),
        arc_kinds: ARC_KINDS.iter().map(|s| (*s).to_string()).collect(),
        chapter_status: CHAPTER_STATUS.iter().map(|s| (*s).to_string()).collect(),
    }
}
