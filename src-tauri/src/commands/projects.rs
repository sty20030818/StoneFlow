use serde::Deserialize;
use tauri::State;

use crate::db::DbState;
use crate::repos::project_repo::ProjectRepo;
use crate::types::{
    dto::{LinkInputDto, ProjectDto},
    error::ApiError,
};

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

/// 列出某个 Space 下的已软删除 Project。
#[tauri::command]
pub async fn list_deleted_projects(
    state: State<'_, DbState>,
    args: ListProjectsArgs,
) -> Result<Vec<ProjectDto>, ApiError> {
    ProjectRepo::list_deleted_by_space(&state.conn, &args.space_id)
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
    pub rank: Option<i64>,
    pub tags: Option<Vec<String>>,
    pub links: Option<Vec<LinkInputDto>>,
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
        args.rank,
        args.tags,
        args.links,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderProjectArgs {
    pub project_id: String,
    pub new_rank: i64,
    /// 可选：如果需要更新父节点（跨层级拖拽）
    pub new_parent_id: Option<Option<String>>,
}

/// 更新项目的 rank（和可选的 parentId）用于拖拽排序。
#[tauri::command]
pub async fn reorder_project(
    state: State<'_, DbState>,
    args: ReorderProjectArgs,
) -> Result<(), ApiError> {
    ProjectRepo::reorder(
        &state.conn,
        &args.project_id,
        args.new_rank,
        args.new_parent_id.as_ref().map(|v| v.as_deref()),
    )
    .await
    .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RebalanceProjectRanksArgs {
    /// 按顺序排列的项目 ID 列表
    pub project_ids: Vec<String>,
    /// 步长，默认 1024
    pub step: Option<i64>,
}

/// 批量重排项目 rank（用于阈值触发的无感重排）。
#[tauri::command]
pub async fn rebalance_project_ranks(
    state: State<'_, DbState>,
    args: RebalanceProjectRanksArgs,
) -> Result<(), ApiError> {
    let step = args.step.unwrap_or(1024);
    ProjectRepo::rebalance_ranks(&state.conn, &args.project_ids, step)
        .await
        .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteProjectArgs {
    pub project_id: String,
}

/// 软删除项目。
#[tauri::command]
pub async fn delete_project(
    state: State<'_, DbState>,
    args: DeleteProjectArgs,
) -> Result<(), ApiError> {
    ProjectRepo::soft_delete(&state.conn, &args.project_id)
        .await
        .map_err(ApiError::from)
}

/// 恢复软删除项目。
#[tauri::command]
pub async fn restore_project(
    state: State<'_, DbState>,
    args: DeleteProjectArgs,
) -> Result<(), ApiError> {
    ProjectRepo::restore(&state.conn, &args.project_id)
        .await
        .map_err(ApiError::from)
}
