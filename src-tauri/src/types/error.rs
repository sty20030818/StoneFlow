use serde::Serialize;
use serde_json::Value;

/// 前端可直接展示/处理的错误结构（用于 Tauri command 返回）。
#[derive(Debug, Serialize)]
pub struct ApiError {
  /// 稳定错误码（便于前端分支处理/埋点）。
  pub code: String,
  /// 面向用户的中文提示，可直接 toast。
  pub message: String,
  /// 可选：开发期排障信息（例如字段名/约束）。
  #[serde(skip_serializing_if = "Option::is_none")]
  pub details: Option<Value>,
}

impl ApiError {
  pub fn validation(message: impl Into<String>) -> Self {
    Self {
      code: "VALIDATION_ERROR".to_string(),
      message: message.into(),
      details: None,
    }
  }

  pub fn db(message: impl Into<String>) -> Self {
    Self {
      code: "DB_ERROR".to_string(),
      message: message.into(),
      details: None,
    }
  }

  pub fn internal(message: impl Into<String>) -> Self {
    Self {
      code: "INTERNAL_ERROR".to_string(),
      message: message.into(),
      details: None,
    }
  }
}

/// Rust 内部错误（不直接暴露给前端；通常会映射为 `ApiError`）。
#[derive(thiserror::Error, Debug)]
pub enum AppError {
  #[error("参数不合法：{0}")]
  Validation(String),

  #[error(transparent)]
  Sqlite(#[from] rusqlite::Error),

  #[error(transparent)]
  Io(#[from] std::io::Error),

  #[error("路径解析失败：{0}")]
  Path(String),
}

impl From<AppError> for ApiError {
  fn from(value: AppError) -> Self {
    match value {
      AppError::Validation(msg) => ApiError::validation(msg),
      AppError::Sqlite(e) => ApiError::db(e.to_string()),
      AppError::Io(e) => ApiError::internal(e.to_string()),
      AppError::Path(msg) => ApiError::internal(msg),
    }
  }
}


