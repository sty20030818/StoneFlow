use serde::Deserialize;
use tauri::State;

use crate::db::DbState;
use crate::repos::task_repo::TaskRepo;
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
    pub done_reason: Option<Option<String>>,
    pub priority: Option<String>,
    /// Some(None) 表示清空 note
    pub note: Option<Option<String>>,
    /// 标签名数组（传空数组表示清空）
    pub tags: Option<Vec<String>>,
    /// 切换所属 Space
    pub space_id: Option<String>,
    /// Some(None) 表示设为未分类
    pub project_id: Option<Option<String>>,
    /// Some(None) 表示清空截止日期
    pub deadline_at: Option<Option<i64>>,
    /// 更新排序权重
    pub rank: Option<i64>,
    /// 外部链接列表（传空数组表示清空）
    pub links: Option<Vec<LinkInputDto>>,
    /// Some(None) 表示清空 customFields
    pub custom_fields: Option<Option<CustomFieldsDto>>,
    /// Some(None) 表示清空归档时间
    pub archived_at: Option<Option<i64>>,
    /// Some(None) 表示清空删除时间
    pub deleted_at: Option<Option<i64>>,
}

#[tauri::command]
pub async fn update_task(state: State<'_, DbState>, args: UpdateTaskArgs) -> Result<(), ApiError> {
    TaskRepo::update(
        &state.conn,
        &args.id,
        args.patch.title.as_deref(),
        args.patch.status.as_deref(),
        args.patch.done_reason.as_ref().map(|v| v.as_deref()),
        args.patch.priority.as_deref(),
        args.patch.note.as_ref().map(|v| v.as_deref()),
        args.patch.tags,
        args.patch.space_id.as_deref(),
        args.patch.project_id.as_ref().map(|v| v.as_deref()),
        args.patch.deadline_at.as_ref().cloned(),
        args.patch.rank,
        args.patch.links,
        args.patch.custom_fields,
        args.patch.archived_at.as_ref().cloned(),
        args.patch.deleted_at.as_ref().cloned(),
    )
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
    TaskRepo::update(
        &state.conn,
        &args.task_id,
        None, // title
        None, // status
        None, // done_reason
        None, // priority
        None, // note
        None, // tags
        None, // space_id
        None, // project_id
        None, // deadline_at
        Some(args.new_rank),
        None, // links
        None, // custom_fields
        None, // archived_at
        None, // deleted_at
    )
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
    let step = args.step.unwrap_or(1024);
    for (index, task_id) in args.task_ids.iter().enumerate() {
        let new_rank = (index as i64) * step;
        TaskRepo::update(
            &state.conn,
            task_id,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            Some(new_rank),
            None,
            None,
            None,
            None,
        )
        .await
        .map_err(ApiError::from)?;
    }
    Ok(())
}
