use tauri::State;

use crate::db::DbState;
use crate::repos::project_repo::ProjectRepo;
use crate::types::{dto::ProjectDto, error::ApiError};

#[tauri::command]
pub fn list_projects(
  state: State<'_, DbState>,
  space_id: Option<String>,
) -> Result<Vec<ProjectDto>, ApiError> {
  let conn = state
    .conn
    .lock()
    .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

  ProjectRepo::list(&conn, space_id.as_deref()).map_err(ApiError::from)
}

#[tauri::command]
pub fn create_project(
  state: State<'_, DbState>,
  space_id: String,
  name: String,
) -> Result<ProjectDto, ApiError> {
  let conn = state
    .conn
    .lock()
    .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

  ProjectRepo::create(&conn, &space_id, &name).map_err(ApiError::from)
}


