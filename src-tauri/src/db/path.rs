use std::path::PathBuf;

use crate::types::error::AppError;
use tauri::{path::BaseDirectory, AppHandle, Manager};

pub fn resolve_db_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let path = app
        .path()
        .resolve("stoneflow/stoneflow.db", BaseDirectory::AppData)
        .map_err(|e| AppError::Path(e.to_string()))?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    Ok(path)
}
