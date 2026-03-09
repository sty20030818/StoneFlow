use serde_json::{json, Value};

use crate::types::error::ApiError;

#[derive(Debug, thiserror::Error)]
#[error("{message}")]
pub struct SyncError {
    pub code: &'static str,
    pub message: String,
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

    pub(super) fn validation(message: impl Into<String>) -> Self {
        Self::new("SYNC_VALIDATION_ERROR", message, None)
    }

    pub(super) fn connection(error: impl std::fmt::Display) -> Self {
        Self::new(
            "SYNC_CONNECTION_ERROR",
            format!("连接远程数据库失败: {}", error),
            None,
        )
    }

    pub(super) fn migration(error: impl std::fmt::Display) -> Self {
        Self::new(
            "SYNC_MIGRATION_ERROR",
            format!("远程数据库迁移失败: {}", error),
            None,
        )
    }

    pub(super) fn watermark_read(key: &'static str, error: impl std::fmt::Display) -> Self {
        Self::new(
            "SYNC_WATERMARK_READ_ERROR",
            format!("读取本地 {} 失败: {}", key, error),
            Some(json!({ "key": key })),
        )
    }

    pub(super) fn watermark_write(key: &'static str, error: impl std::fmt::Display) -> Self {
        Self::new(
            "SYNC_WATERMARK_WRITE_ERROR",
            format!("更新 {} 失败: {}", key, error),
            Some(json!({ "key": key })),
        )
    }

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
    fn from(value: SyncError) -> Self {
        ApiError::custom(value.code, value.message, value.details)
    }
}
