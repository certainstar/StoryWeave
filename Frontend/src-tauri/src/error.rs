//! 命令失败时返回给界面的错误。
//!
//! `message` 只告诉作者下一步能做什么，不包含路径、密钥或正文。

use serde::Serialize;

/// 失败信封里的错误。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiError {
    /// 稳定错误码，例如 `VALIDATION_ERROR`。
    pub code: &'static str,
    /// 细分原因，例如 `EMPTY_NAME`。没有细分时省略。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<&'static str>,
    /// 给作者看的句子。
    pub message: String,
}

impl ApiError {
    /// 参数不合法。
    ///
    /// * `reason` - 细分原因，见错误码表。
    /// * `message` - 作者能据此修改的句子。
    ///
    /// 返回 `VALIDATION_ERROR`，调用方不得写入。
    pub fn validation(reason: &'static str, message: impl Into<String>) -> Self {
        Self {
            code: "VALIDATION_ERROR",
            reason: Some(reason),
            message: message.into(),
        }
    }

    /// 对象不存在。
    ///
    /// 返回 `NOT_FOUND`。数据不变。
    pub fn not_found() -> Self {
        Self {
            code: "NOT_FOUND",
            reason: None,
            message: "对象已不在。回到列表。".into(),
        }
    }

    /// 数据库或文件读写失败。
    ///
    /// 返回 `STORAGE_ERROR`。已经提交的数据保持原样。
    pub fn storage() -> Self {
        Self {
            code: "STORAGE_ERROR",
            reason: None,
            message: "刚才这次没有保存。可以重试。".into(),
        }
    }

    /// 项目库无法迁移。
    ///
    /// 返回 `MIGRATION_ERROR`。
    pub fn migration() -> Self {
        Self {
            code: "MIGRATION_ERROR",
            reason: None,
            message: "这个项目打不开。可以用最近的快照恢复。".into(),
        }
    }

    /// 快照或恢复失败。
    ///
    /// 返回 `BACKUP_ERROR`。当前项目保持原样。
    pub fn backup() -> Self {
        Self {
            code: "BACKUP_ERROR",
            reason: None,
            message: "恢复没有执行。".into(),
        }
    }
}

/// 命令的统一返回。成功和失败都放在这个信封里。
#[derive(Debug, Serialize)]
pub struct CommandResult<T: Serialize> {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiError>,
}

impl<T: Serialize> CommandResult<T> {
    /// 成功信封。
    ///
    /// * `data` - 命令的返回值。
    pub fn ok(data: T) -> Self {
        Self {
            ok: true,
            data: Some(data),
            error: None,
        }
    }

    /// 失败信封。
    ///
    /// * `error` - 错误码和作者能看的句子。
    pub fn err(error: ApiError) -> Self {
        Self {
            ok: false,
            data: None,
            error: Some(error),
        }
    }

    /// 把领域结果包进信封。
    ///
    /// * `result` - `Ok` 成为 `data`，`Err` 成为 `error`。
    pub fn from_result(result: Result<T, ApiError>) -> Self {
        match result {
            Ok(data) => Self::ok(data),
            Err(error) => Self::err(error),
        }
    }
}
