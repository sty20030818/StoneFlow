//! Task 命令边界。
//!
//! 学习要点：
//! - patch 模式更新：只传变化字段
//! - tri-state（`Option<Option<T>>`）表达“保持/清空/设置”
//! - 读命令直达 `TaskRepo`，写命令统一走 `TaskService`

use serde::Deserialize;
use tauri::State;

use crate::db::DbState;
use crate::repos::task_repo::TaskRepo;
use crate::services::{
    TaskCreateInput, TaskCreatePatch, TaskService, TaskUpdateInput,
    TaskUpdatePatch as ServiceTaskUpdatePatch,
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

/// 列出任务。
///
/// 这是纯查询命令，因此直接走 `TaskRepo`，不经过 service。
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

/// 列出已软删除任务。
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

/// 创建“最小输入”任务。
///
/// 这个命令适合快速收件箱场景，只传标题和最基础上下文，
/// 其余字段在 service 内走默认值。
#[tauri::command]
pub async fn create_task(
    state: State<'_, DbState>,
    args: CreateTaskArgs,
) -> Result<TaskDto, ApiError> {
    TaskService::create(
        &state.conn,
        TaskCreateInput {
            space_id: args.space_id,
            title: args.title,
            auto_start: args.auto_start.unwrap_or(true),
            project_id: args.project_id,
            patch: TaskCreatePatch::default(),
        },
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

/// 创建带 patch 的任务。
///
/// 与 `create_task` 相比，这个入口允许一次性写入状态、优先级、
/// 截止时间、标签、链接和自定义字段。
#[tauri::command]
pub async fn create_task_with_patch(
    state: State<'_, DbState>,
    args: CreateTaskWithPatchArgs,
) -> Result<TaskDto, ApiError> {
    TaskService::create(
        &state.conn,
        TaskCreateInput {
            space_id: args.space_id,
            title: args.title,
            auto_start: args.auto_start.unwrap_or(true),
            project_id: args.project_id,
            patch: TaskCreatePatch {
                status: args.status,
                done_reason: args.done_reason,
                priority: args.priority,
                note: args.note,
                deadline_at: args.deadline_at,
                tags: args.tags,
                links: args.links,
                custom_fields: args.custom_fields,
            },
        },
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

impl From<UpdateTaskPatch> for ServiceTaskUpdatePatch {
    /// 把命令层 DTO 转成 service 层 patch。
    ///
    /// 这样 service 不需要知道 Tauri 具体如何反序列化参数。
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

/// 更新任务。
#[tauri::command]
pub async fn update_task(state: State<'_, DbState>, args: UpdateTaskArgs) -> Result<(), ApiError> {
    TaskService::update(
        &state.conn,
        TaskUpdateInput {
            id: args.id,
            patch: args.patch.into(),
        },
    )
    .await
    .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteTaskArgs {
    pub id: String,
}

/// 直接完成任务。
#[tauri::command]
pub async fn complete_task(
    state: State<'_, DbState>,
    args: CompleteTaskArgs,
) -> Result<(), ApiError> {
    TaskService::complete(&state.conn, &args.id)
        .await
        .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteTasksArgs {
    pub ids: Vec<String>,
}

/// 批量软删除任务。
#[tauri::command]
pub async fn delete_tasks(
    state: State<'_, DbState>,
    args: DeleteTasksArgs,
) -> Result<usize, ApiError> {
    TaskService::delete_many(&state.conn, &args.ids)
        .await
        .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreTasksArgs {
    pub ids: Vec<String>,
}

/// 批量恢复任务。
#[tauri::command]
pub async fn restore_tasks(
    state: State<'_, DbState>,
    args: RestoreTasksArgs,
) -> Result<usize, ApiError> {
    TaskService::restore_many(&state.conn, &args.ids)
        .await
        .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderTaskArgs {
    pub task_id: String,
    pub new_rank: i64,
}

/// 调整单个任务排序。
#[tauri::command]
pub async fn reorder_task(
    state: State<'_, DbState>,
    args: ReorderTaskArgs,
) -> Result<(), ApiError> {
    TaskService::reorder(&state.conn, args.task_id, args.new_rank)
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

/// 按顺序批量重排任务 rank。
#[tauri::command]
pub async fn rebalance_ranks(
    state: State<'_, DbState>,
    args: RebalanceRanksArgs,
) -> Result<(), ApiError> {
    TaskService::rebalance(&state.conn, &args.task_ids, args.step.unwrap_or(1024))
        .await
        .map_err(ApiError::from)
}
