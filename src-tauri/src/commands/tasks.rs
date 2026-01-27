use serde::Deserialize;
use tauri::State;

use crate::db::DbState;
use crate::repos::task_repo::TaskRepo;
use crate::types::{dto::TaskDto, error::ApiError};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTasksArgs {
    pub space_id: Option<String>,
    pub status: Option<String>,
    pub project_id: Option<String>,
}

#[tauri::command]
pub fn list_tasks(
    state: State<'_, DbState>,
    args: ListTasksArgs,
) -> Result<Vec<TaskDto>, ApiError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

    TaskRepo::list(
        &conn,
        args.space_id.as_deref(),
        args.status.as_deref(),
        args.project_id.as_deref(),
    )
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
pub fn create_task(state: State<'_, DbState>, args: CreateTaskArgs) -> Result<TaskDto, ApiError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

    let auto_start = args.auto_start.unwrap_or(true);
    TaskRepo::create(
        &conn,
        &args.space_id,
        &args.title,
        auto_start,
        args.project_id.as_deref(),
    )
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
    pub priority: Option<String>,
    /// Some(None) 表示清空 note
    pub note: Option<Option<String>>,
    /// 标签名数组（传空数组表示清空）
    pub tags: Option<Vec<String>>,
    /// Some(None) 表示清空 project_path
    pub project_path: Option<Option<String>>,
    /// 切换所属 Space
    pub space_id: Option<String>,
    /// Some(None) 表示设为未分类
    pub project_id: Option<Option<String>>,
    /// Some(None) 表示清空截止日期
    pub planned_end_date: Option<Option<i64>>,
}

#[tauri::command]
pub fn update_task(state: State<'_, DbState>, args: UpdateTaskArgs) -> Result<(), ApiError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

    TaskRepo::update(
        &mut conn,
        &args.id,
        args.patch.title.as_deref(),
        args.patch.status.as_deref(),
        args.patch.priority.as_deref(),
        args.patch.note.as_ref().map(|v| v.as_deref()),
        args.patch.tags,
        args.patch.project_path.as_ref().map(|v| v.as_deref()),
        args.patch.space_id.as_deref(),
        args.patch.project_id.as_ref().map(|v| v.as_deref()),
        args.patch.planned_end_date.as_ref().cloned(),
    )
    .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteTaskArgs {
    pub id: String,
}

#[tauri::command]
pub fn complete_task(state: State<'_, DbState>, args: CompleteTaskArgs) -> Result<(), ApiError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

    TaskRepo::complete(&conn, &args.id).map_err(ApiError::from)
}
