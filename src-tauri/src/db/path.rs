//! 数据库文件路径解析。
//! 重点：路径属于运行环境边界，错误需要转换为业务可识别的 `AppError`。

use std::path::PathBuf;

use crate::types::error::AppError;
use tauri::{path::BaseDirectory, AppHandle, Manager};

pub fn resolve_db_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    // 在 AppData 下创建独立目录，避免污染工作目录。
    let path = app
        .path()
        .resolve("stoneflow/stoneflow.db", BaseDirectory::AppData)
        .map_err(|e| AppError::Path(e.to_string()))?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    Ok(path)
}
