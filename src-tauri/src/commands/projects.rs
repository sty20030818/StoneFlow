use serde::Deserialize;
use tauri::State;

use crate::db::DbState;
use crate::repos::project_repo::ProjectRepo;
use crate::types::{dto::ProjectDto, error::ApiError};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProjectsArgs {
  pub space_id: String,
}

/// 列出某个 Space 下的全部 Project（包括 Default Project 与其子节点）。
#[tauri::command]
pub fn list_projects(
  state: State<'_, DbState>,
  args: ListProjectsArgs,
) -> Result<Vec<ProjectDto>, ApiError> {
  let conn = state
    .conn
    .lock()
    .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

  ProjectRepo::list_by_space(&conn, &args.space_id).map_err(ApiError::from)
}

