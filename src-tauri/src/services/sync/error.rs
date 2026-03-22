//! 同步子系统内部错误定义。
//!
//! 设计目的：
//! - 在 service 内部保留同步语义，而不是退化成裸字符串
//! - 在命令层再统一映射成 `ApiError`
//! - 给前端稳定的 `code`，避免再靠 message 文本做分支

use serde_json::{Value, json};

use crate::types::error::ApiError;

#[derive(Debug, thiserror::Error)]
#[error("{message}")]
pub struct SyncError {
    /// 稳定错误码，前端可以据此做国际化和分支处理。
    pub code: &'static str,
    /// 面向用户或日志的可读错误信息。
    pub message: String,
    /// 补充调试信息，例如方向、表名、水位 key。
    pub details: Option<Value>,
}

impl SyncError {
    fn new(code: &'static str, message: impl Into<String>, details: Option<Value>) -> Self {
        Self {
            code,
            message: message.into(),
            details,
        }
    }

    /// 参数层错误，通常意味着无需重试，应先修正输入。
    pub(super) fn validation(message: impl Into<String>) -> Self {
        Self::new("SYNC_VALIDATION_ERROR", message, None)
    }

    /// 连接层错误，说明还没进入真实同步阶段。
    pub(super) fn connection(error: impl std::fmt::Display) -> Self {
        Self::new(
            "SYNC_CONNECTION_ERROR",
            format!("连接远程数据库失败: {}", error),
            None,
        )
    }

    /// 迁移失败说明远端 schema 状态不满足同步前提。
    pub(super) fn migration(error: impl std::fmt::Display) -> Self {
        Self::new(
            "SYNC_MIGRATION_ERROR",
            format!("远程数据库迁移失败: {}", error),
            None,
        )
    }

    /// 读取水位失败会直接阻断同步，因为无法确定增量起点。
    pub(super) fn watermark_read(
        key: impl Into<String>,
        error: impl std::fmt::Display,
    ) -> Self {
        let key = key.into();
        Self::new(
            "SYNC_WATERMARK_READ_ERROR",
            format!("读取本地 {} 失败: {}", key, error),
            Some(json!({ "key": key })),
        )
    }

    /// 更新水位失败同样要算整轮失败，否则下次会出现重复或错位同步。
    pub(super) fn watermark_write(
        key: impl Into<String>,
        error: impl std::fmt::Display,
    ) -> Self {
        let key = key.into();
        Self::new(
            "SYNC_WATERMARK_WRITE_ERROR",
            format!("更新 {} 失败: {}", key, error),
            Some(json!({ "key": key })),
        )
    }

    /// 源端读取失败：pull 时源端是远端，push 时源端是本地。
    pub(super) fn source_read(
        direction: &'static str,
        table: &'static str,
        error: impl std::fmt::Display,
    ) -> Self {
        let message = match direction {
            "pull" => format!("拉取远程 {} 失败: {}", table, error),
            _ => format!("读取本地 {} 失败: {}", table, error),
        };
        Self::new(
            "SYNC_SOURCE_READ_ERROR",
            message,
            Some(json!({ "direction": direction, "table": table })),
        )
    }

    /// 读取目标端已有版本号，用于判断是 insert / update / conflict skip。
    pub(super) fn target_state_read(
        direction: &'static str,
        table: &'static str,
        error: impl std::fmt::Display,
    ) -> Self {
        let message = match direction {
            "pull" => format!("读取本地 {} 既有数据失败: {}", table, error),
            _ => format!("读取远程 {} 既有数据失败: {}", table, error),
        };
        Self::new(
            "SYNC_TARGET_STATE_ERROR",
            message,
            Some(json!({ "direction": direction, "table": table })),
        )
    }

    /// 真正写入目标端失败时，统一落到这个错误类别。
    pub(super) fn write_target(
        direction: &'static str,
        record: &'static str,
        error: impl std::fmt::Display,
    ) -> Self {
        let message = match direction {
            "pull" => format!("同步 {} 到本地失败: {}", record, error),
            _ => format!("推送 {} 到远程失败: {}", record, error),
        };
        Self::new(
            "SYNC_WRITE_ERROR",
            message,
            Some(json!({ "direction": direction, "record": record })),
        )
    }
}

impl From<SyncError> for ApiError {
    /// 命令层不再自己拼错误对象，而是统一复用这里的结构化映射。
    fn from(value: SyncError) -> Self {
        ApiError::custom(value.code, value.message, value.details)
    }
}
