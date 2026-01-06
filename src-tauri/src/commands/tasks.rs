use serde::Deserialize;
use tauri::State;

use crate::db::DbState;
use crate::repos::task_repo::{ProjectIdFilter, TaskRepo};
use crate::types::{dto::TaskDto, error::ApiError};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTasksArgs {
  pub space_id: Option<String>,
  /// 说明：
  /// - 字段缺失：不按 project 过滤
  /// - 显式 null：只取 project_id IS NULL
  /// - 字符串：只取某 project_id
  pub project_id: Option<Option<String>>,
  pub status: Option<String>,
}

#[tauri::command]
pub fn list_tasks(state: State<'_, DbState>, args: ListTasksArgs) -> Result<Vec<TaskDto>, ApiError> {
  let conn = state
    .conn
    .lock()
    .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

  let project_filter = match args.project_id {
    None => ProjectIdFilter::Any,
    Some(None) => ProjectIdFilter::Null,
    Some(Some(ref v)) => ProjectIdFilter::Eq(v),
  };

  TaskRepo::list(
    &conn,
    args.space_id.as_deref(),
    project_filter,
    args.status.as_deref(),
  )
  .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskArgs {
  pub space_id: String,
  pub project_id: Option<String>,
  pub title: String,
  pub note: Option<String>,
  /// 前端 settings.autoStart 的值；不传默认 true
  pub auto_start: Option<bool>,
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
    args.project_id.as_deref(),
    &args.title,
    args.note.as_deref(),
    auto_start,
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
  /// 字段缺失：不修改；显式 null：置空；字符串：设置值
  pub note: Option<Option<String>>,
  pub status: Option<String>,
  /// 字段缺失：不修改；显式 null：置空；字符串：设置值
  pub project_id: Option<Option<String>>,
}

#[tauri::command]
pub fn update_task(state: State<'_, DbState>, args: UpdateTaskArgs) -> Result<(), ApiError> {
  let conn = state
    .conn
    .lock()
    .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

  TaskRepo::update_basic(
    &conn,
    &args.id,
    args.patch.title.as_deref(),
    args.patch.note.as_ref().map(|v| v.as_deref()),
    args.patch.status.as_deref(),
    args.patch
      .project_id
      .as_ref()
      .map(|v| v.as_deref()),
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskTimelineArgs {
  pub id: String,
  pub created_at: Option<i64>,
  /// 字段缺失：不修改；显式 null：置空；数字：设置值
  pub started_at: Option<Option<i64>>,
  pub reason: String,
}

#[tauri::command]
pub fn update_task_timeline(
  state: State<'_, DbState>,
  args: UpdateTaskTimelineArgs,
) -> Result<(), ApiError> {
  let conn = state
    .conn
    .lock()
    .map_err(|_| ApiError::internal("数据库锁获取失败".to_string()))?;

  TaskRepo::update_timeline_strict(
    &conn,
    &args.id,
    args.created_at,
    args.started_at,
    &args.reason,
  )
  .map_err(ApiError::from)
}