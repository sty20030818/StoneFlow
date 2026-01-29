use tauri::State;

use crate::db::DbState;
use crate::repos::space_repo::SpaceRepo;
use crate::types::{dto::SpaceDto, error::ApiError};

#[tauri::command]
pub fn list_spaces(state: State<'_, DbState>) -> Result<Vec<SpaceDto>, ApiError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

    SpaceRepo::list(&conn).map_err(ApiError::from)
}
