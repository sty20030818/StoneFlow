//! Task 命令边界。
//!
//! 学习要点：
//! - patch 模式更新：只传变化字段
//! - tri-state（`Option<Option<T>>`）表达“保持/清空/设置”
//! - 命令层不直接碰实体，统一通过 `TaskRepo`

use serde::Deserialize;
use tauri::State;

use crate::db::DbState;
use crate::repos::task_repo::{
    TaskCreatePatchInput, TaskRepo, TaskUpdateInput, TaskUpdatePatch as RepoTaskUpdatePatch,
};
use crate::types::{
    dto::{CustomFieldsDto, LinkInputDto, TaskDto},
    error::ApiError,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTasksArgs {
    pub space_id: Option<String>,
    pub status: Option<String>,
    pub project_id: Option<String>,
}

#[tauri::command]
pub async fn list_tasks(
    state: State<'_, DbState>,
    args: ListTasksArgs,
) -> Result<Vec<TaskDto>, ApiError> {
    TaskRepo::list(
        &state.conn,
        args.space_id.as_deref(),
        args.status.as_deref(),
        args.project_id.as_deref(),
    )
    .await
    .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListDeletedTasksArgs {
    pub space_id: Option<String>,
    pub status: Option<String>,
    pub project_id: Option<String>,
}

#[tauri::command]
pub async fn list_deleted_tasks(
    state: State<'_, DbState>,
    args: ListDeletedTasksArgs,
) -> Result<Vec<TaskDto>, ApiError> {
    TaskRepo::list_deleted(
        &state.conn,
        args.space_id.as_deref(),
        args.status.as_deref(),
        args.project_id.as_deref(),
    )
    .await
    .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskArgs {
    pub space_id: String,
    pub title: String,
    /// 前端 settings.autoStart 的值；不传默认 true
    pub auto_start: Option<bool>,
    /// 项目 ID（可选，如果不提供则关联到默认项目）
    pub project_id: Option<String>,
}

#[tauri::command]
pub async fn create_task(
    state: State<'_, DbState>,
    args: CreateTaskArgs,
) -> Result<TaskDto, ApiError> {
    let auto_start = args.auto_start.unwrap_or(true);
    TaskRepo::create(
        &state.conn,
        &args.space_id,
        &args.title,
        auto_start,
        args.project_id.as_deref(),
    )
    .await
    .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskWithPatchArgs {
    pub space_id: String,
    pub title: String,
    pub auto_start: Option<bool>,
    pub project_id: Option<String>,
    pub status: Option<String>,
    pub done_reason: Option<String>,
    pub priority: Option<String>,
    pub note: Option<String>,
    pub deadline_at: Option<i64>,
    pub tags: Option<Vec<String>>,
    pub links: Option<Vec<LinkInputDto>>,
    pub custom_fields: Option<CustomFieldsDto>,
}

#[tauri::command]
pub async fn create_task_with_patch(
    state: State<'_, DbState>,
    args: CreateTaskWithPatchArgs,
) -> Result<TaskDto, ApiError> {
    let auto_start = args.auto_start.unwrap_or(true);
    let patch = TaskCreatePatchInput {
        status: args.status,
        done_reason: args.done_reason,
        priority: args.priority,
        note: args.note,
        deadline_at: args.deadline_at,
        tags: args.tags,
        links: args.links,
        custom_fields: args.custom_fields,
    };
    TaskRepo::create_with_patch(
        &state.conn,
        &args.space_id,
        &args.title,
        auto_start,
        args.project_id.as_deref(),
        patch,
    )
    .await
    .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskArgs {
    pub id: String,
    pub patch: UpdateTaskPatch,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskPatch {
    pub title: Option<String>,
    pub status: Option<String>,
    /// Some(None) 表示清空 doneReason
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub done_reason: Option<Option<String>>,
    pub priority: Option<String>,
    /// Some(None) 表示清空 note
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub note: Option<Option<String>>,
    /// 标签名数组（传空数组表示清空）
    pub tags: Option<Vec<String>>,
    /// 切换所属 Space
    pub space_id: Option<String>,
    /// Some(None) 表示设为未分类
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub project_id: Option<Option<String>>,
    /// Some(None) 表示清空截止日期
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub deadline_at: Option<Option<i64>>,
    /// 更新排序权重
    pub rank: Option<i64>,
    /// 外部链接列表（传空数组表示清空）
    pub links: Option<Vec<LinkInputDto>>,
    /// Some(None) 表示清空 customFields
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub custom_fields: Option<Option<CustomFieldsDto>>,
    /// Some(None) 表示清空归档时间
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub archived_at: Option<Option<i64>>,
    /// Some(None) 表示清空删除时间
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub deleted_at: Option<Option<i64>>,
}

impl From<UpdateTaskPatch> for RepoTaskUpdatePatch {
    // 把命令层 DTO 转为 repo 层输入，避免 repo 感知 tauri 参数结构。
    fn from(value: UpdateTaskPatch) -> Self {
        Self {
            title: value.title,
            status: value.status,
            done_reason: value.done_reason,
            priority: value.priority,
            note: value.note,
            tags: value.tags,
            space_id: value.space_id,
            project_id: value.project_id,
            deadline_at: value.deadline_at,
            rank: value.rank,
            links: value.links,
            custom_fields: value.custom_fields,
            archived_at: value.archived_at,
            deleted_at: value.deleted_at,
        }
    }
}

#[tauri::command]
pub async fn update_task(state: State<'_, DbState>, args: UpdateTaskArgs) -> Result<(), ApiError> {
    // 重点：`id + patch` 模式比长参数函数更稳定、可扩展。
    let input = TaskUpdateInput {
        id: args.id,
        patch: args.patch.into(),
    };
    TaskRepo::update(&state.conn, input)
        .await
        .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteTaskArgs {
    pub id: String,
}

#[tauri::command]
pub async fn complete_task(
    state: State<'_, DbState>,
    args: CompleteTaskArgs,
) -> Result<(), ApiError> {
    TaskRepo::complete(&state.conn, &args.id)
        .await
        .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteTasksArgs {
    pub ids: Vec<String>,
}

#[tauri::command]
pub async fn delete_tasks(
    state: State<'_, DbState>,
    args: DeleteTasksArgs,
) -> Result<usize, ApiError> {
    TaskRepo::delete_many(&state.conn, &args.ids)
        .await
        .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreTasksArgs {
    pub ids: Vec<String>,
}

#[tauri::command]
pub async fn restore_tasks(
    state: State<'_, DbState>,
    args: RestoreTasksArgs,
) -> Result<usize, ApiError> {
    TaskRepo::restore_many(&state.conn, &args.ids)
        .await
        .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderTaskArgs {
    pub task_id: String,
    pub new_rank: i64,
}

/// 更新单个任务的 rank
#[tauri::command]
pub async fn reorder_task(
    state: State<'_, DbState>,
    args: ReorderTaskArgs,
) -> Result<(), ApiError> {
    // 仅修改 rank，其他字段保持不变。
    let input = TaskUpdateInput {
        id: args.task_id,
        patch: RepoTaskUpdatePatch::rank_only(args.new_rank),
    };
    TaskRepo::update(&state.conn, input)
        .await
        .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RebalanceRanksArgs {
    /// 按顺序排列的任务 ID 列表
    pub task_ids: Vec<String>,
    /// 步长，默认 1024
    pub step: Option<i64>,
}

/// 批量重排任务 rank（用于阈值触发的无感重排）
#[tauri::command]
pub async fn rebalance_ranks(
    state: State<'_, DbState>,
    args: RebalanceRanksArgs,
) -> Result<(), ApiError> {
    // 重点：这里逐条更新，逻辑简单直观；后续可按性能需求改为批量 SQL。
    let step = args.step.unwrap_or(1024);
    for (index, task_id) in args.task_ids.iter().enumerate() {
        let new_rank = (index as i64) * step;
        let input = TaskUpdateInput {
            id: task_id.clone(),
            patch: RepoTaskUpdatePatch::rank_only(new_rank),
        };
        TaskRepo::update(&state.conn, input)
            .await
            .map_err(ApiError::from)?;
    }
    Ok(())
}
