//! Project 命令边界。
//!
//! 学习要点：
//! - 参数 DTO 与 repo 输入结构体的映射
//! - `Option<Option<T>>` 在“清空字段 vs 不修改字段”场景的语义
//! - 纯查询直达 `ProjectRepo`，写命令统一走 `ProjectService`

use serde::Deserialize;
use tauri::State;

use crate::db::DbState;
use crate::repos::project_repo::ProjectRepo;
use crate::services::{
    ProjectCreateInput, ProjectService, ProjectUpdateInput,
    ProjectUpdatePatch as ServiceProjectUpdatePatch,
};
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectArgs {
    pub project_id: String,
    pub patch: UpdateProjectPatch,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectPatch {
    pub title: Option<String>,
    /// Some(None) 表示清空 note。
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub note: Option<Option<String>>,
    pub priority: Option<String>,
    pub space_id: Option<String>,
    /// Some(None) 表示移动到顶层。
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub parent_id: Option<Option<String>>,
    /// 传空数组表示清空标签。
    pub tags: Option<Vec<String>>,
    /// 传空数组表示清空链接。
    pub links: Option<Vec<LinkInputDto>>,
}

impl From<UpdateProjectPatch> for ServiceProjectUpdatePatch {
    fn from(value: UpdateProjectPatch) -> Self {
        Self {
            title: value.title,
            note: value.note,
            priority: value.priority,
            space_id: value.space_id,
            parent_id: value.parent_id,
            tags: value.tags,
            links: value.links,
        }
    }
}

/// 创建新项目。
/// 重点：这里先构造 `ProjectCreateInput`，减少长参数列表带来的可读性问题。
#[tauri::command]
pub async fn create_project(
    state: State<'_, DbState>,
    args: CreateProjectArgs,
) -> Result<ProjectDto, ApiError> {
    ProjectService::create(
        &state.conn,
        ProjectCreateInput {
            space_id: args.space_id,
            title: args.title,
            parent_id: args.parent_id,
            note: args.note,
            priority: args.priority,
            rank: args.rank,
            tags: args.tags,
            links: args.links,
        },
    )
    .await
    .map_err(ApiError::from)
}

#[tauri::command]
pub async fn update_project(
    state: State<'_, DbState>,
    args: UpdateProjectArgs,
) -> Result<(), ApiError> {
    ProjectService::update(
        &state.conn,
        ProjectUpdateInput {
            project_id: args.project_id,
            patch: args.patch.into(),
        },
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
    /// - None：不修改 parent
    /// - Some(None)：显式设为根节点
    /// - Some(Some(x))：移动到 x 下面
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub new_parent_id: Option<Option<String>>,
}

/// 更新项目的 rank（和可选的 parentId）用于拖拽排序。
#[tauri::command]
pub async fn reorder_project(
    state: State<'_, DbState>,
    args: ReorderProjectArgs,
) -> Result<(), ApiError> {
    ProjectService::reorder(
        &state.conn,
        &args.project_id,
        args.new_rank,
        args.new_parent_id,
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
    ProjectService::rebalance(&state.conn, &args.project_ids, args.step.unwrap_or(1024))
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
    ProjectService::delete_subtree(&state.conn, &args.project_id)
        .await
        .map_err(ApiError::from)
}

/// 恢复软删除项目。
#[tauri::command]
pub async fn restore_project(
    state: State<'_, DbState>,
    args: DeleteProjectArgs,
) -> Result<(), ApiError> {
    ProjectService::restore(&state.conn, &args.project_id)
        .await
        .map_err(ApiError::from)
}

/// 归档项目。
#[tauri::command]
pub async fn archive_project(
    state: State<'_, DbState>,
    args: DeleteProjectArgs,
) -> Result<(), ApiError> {
    ProjectService::archive(&state.conn, &args.project_id)
        .await
        .map_err(ApiError::from)
}

/// 取消归档项目。
#[tauri::command]
pub async fn unarchive_project(
    state: State<'_, DbState>,
    args: DeleteProjectArgs,
) -> Result<(), ApiError> {
    ProjectService::unarchive(&state.conn, &args.project_id)
        .await
        .map_err(ApiError::from)
}
