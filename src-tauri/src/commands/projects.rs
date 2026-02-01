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
pub async fn list_projects(
    state: State<'_, DbState>,
    args: ListProjectsArgs,
) -> Result<Vec<ProjectDto>, ApiError> {
    ProjectRepo::list_by_space(&state.conn, &args.space_id)
        .await
        .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectArgs {
    pub space_id: String,
    pub title: String,
    pub parent_id: Option<String>,
    pub note: Option<String>,
    pub priority: Option<String>,
}

/// 创建新项目。
#[tauri::command]
pub async fn create_project(
    state: State<'_, DbState>,
    args: CreateProjectArgs,
) -> Result<ProjectDto, ApiError> {
    ProjectRepo::create(
        &state.conn,
        &args.space_id,
        &args.title,
        args.parent_id.as_deref(),
        args.note.as_deref(),
        args.priority.as_deref(),
    )
    .await
    .map_err(ApiError::from)
}

/// 获取默认 Project。
#[tauri::command]
pub async fn get_default_project(
    state: State<'_, DbState>,
    space_id: String,
) -> Result<ProjectDto, ApiError> {
    ProjectRepo::get_default_project(&state.conn, &space_id)
        .await
        .map_err(ApiError::from)
}
