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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectArgs {
    pub space_id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub note: Option<String>,
    pub priority: Option<String>,
}

/// 创建新项目。
#[tauri::command]
pub fn create_project(
    state: State<'_, DbState>,
    args: CreateProjectArgs,
) -> Result<ProjectDto, ApiError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

    ProjectRepo::create(
        &conn,
        &args.space_id,
        &args.name,
        args.parent_id.as_deref(),
        args.note.as_deref(),
        args.priority.as_deref(),
    )
    .map_err(ApiError::from)
}

/// 获取默认 Project。
/// 注意：Default Project 应该在数据库初始化时创建，如果不存在则返回错误。
#[tauri::command]
pub fn get_default_project(
    state: State<'_, DbState>,
    space_id: String,
) -> Result<ProjectDto, ApiError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

    ProjectRepo::get_default_project(&conn, &space_id).map_err(ApiError::from)
}
