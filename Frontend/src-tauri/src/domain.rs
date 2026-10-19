//! 不依赖数据库的规则。命令在写入前调用这里。

use crate::error::ApiError;

/// 去掉两端空白，并拒绝空名称。
///
/// * `name` - 作者输入的名称。
///
/// 返回去掉空白后的名称。空白时返回 `VALIDATION_ERROR` / `EMPTY_NAME`。
pub fn require_name(name: &str) -> Result<String, ApiError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        Err(ApiError::validation("EMPTY_NAME", "名称不能为空"))
    } else {
        Ok(trimmed.to_string())
    }
}

/// 关系的两端必须是不同的人。
///
/// * `source_id` - 起点人物。
/// * `target_id` - 终点人物。
///
/// 相同时返回 `VALIDATION_ERROR` / `SELF_RELATION`。
pub fn require_distinct(source_id: &str, target_id: &str) -> Result<(), ApiError> {
    if source_id == target_id {
        Err(ApiError::validation("SELF_RELATION", "不能把人物连向自己"))
    } else {
        Ok(())
    }
}

/// 确认取值属于允许列表。
///
/// * `value` - 待检查的文本。
/// * `allowed` - 允许的取值。
/// * `reason` - 不在列表中时的 reason。
/// * `message` - 给作者看的句子。
pub fn require_one_of(
    value: &str,
    allowed: &[&str],
    reason: &'static str,
    message: &'static str,
) -> Result<(), ApiError> {
    if allowed.contains(&value) {
        Ok(())
    } else {
        Err(ApiError::validation(reason, message))
    }
}

/// `ids` 必须是 `existing` 的一个排列：数量相同、成员相同、没有重复。
///
/// * `existing` - 当前全部 id。
/// * `ids` - 作者给出的新顺序。
///
/// 不满足时返回 `VALIDATION_ERROR`，不写入。
pub fn require_permutation(existing: &[String], ids: &[String]) -> Result<(), ApiError> {
    if existing.len() != ids.len() || has_duplicate(ids) || !same_members(existing, ids) {
        return Err(ApiError::validation(
            "DUPLICATE_LINK",
            "顺序需要包含全部条目，且不能重复。",
        ));
    }
    Ok(())
}

/// 列表里不能有重复 id。
///
/// * `ids` - 待加入的 id。
///
/// 有重复时返回 `VALIDATION_ERROR` / `DUPLICATE_LINK`。
pub fn require_unique(ids: &[String]) -> Result<(), ApiError> {
    if has_duplicate(ids) {
        Err(ApiError::validation("DUPLICATE_LINK", "已经在里面了"))
    } else {
        Ok(())
    }
}

fn has_duplicate(ids: &[String]) -> bool {
    let mut copy = ids.to_vec();
    copy.sort();
    copy.windows(2).any(|pair| pair[0] == pair[1])
}

fn same_members(left: &[String], right: &[String]) -> bool {
    let mut a = left.to_vec();
    let mut b = right.to_vec();
    a.sort();
    b.sort();
    a == b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_name_is_rejected() {
        let error = require_name("  ").unwrap_err();
        assert_eq!(error.reason, Some("EMPTY_NAME"));
    }

    #[test]
    fn self_relation_is_rejected() {
        let error = require_distinct("a", "a").unwrap_err();
        assert_eq!(error.reason, Some("SELF_RELATION"));
    }

    #[test]
    fn reorder_must_keep_every_id() {
        let existing = vec!["a".into(), "b".into()];
        assert!(require_permutation(&existing, &["b".into(), "a".into()]).is_ok());
        assert!(require_permutation(&existing, &["a".into()]).is_err());
    }
}
