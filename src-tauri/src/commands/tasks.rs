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

    TaskRepo::list(&conn, args.space_id.as_deref(), args.status.as_deref()).map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskArgs {
    pub space_id: String,
    pub title: String,
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
    TaskRepo::create(&conn, &args.space_id, &args.title, auto_start).map_err(ApiError::from)
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
        args.patch.status.as_deref(),
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
