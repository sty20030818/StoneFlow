//! 远程同步命令边界。
//!
//! 职责：
//! - 接收前端同步参数
//! - 调用 `SyncService` 执行真实同步流程
//! - 保持返回结构与前端调用约定一致

use tauri::State;

use crate::db::DbState;
use crate::services::{DatabaseUrlArgs, SyncCommandReport, SyncService};
use crate::types::error::ApiError;

/// 触发一次从远端到本地的 pull。
#[tauri::command(rename_all = "camelCase")]
pub async fn pull_from_neon(
    state: State<'_, DbState>,
    args: DatabaseUrlArgs,
) -> Result<SyncCommandReport, ApiError> {
    SyncService::pull(&state.conn, &args.database_url)
        .await
        .map_err(ApiError::from)
}

/// 触发一次从本地到远端的 push。
#[tauri::command(rename_all = "camelCase")]
pub async fn push_to_neon(
    state: State<'_, DbState>,
    args: DatabaseUrlArgs,
) -> Result<SyncCommandReport, ApiError> {
    SyncService::push(&state.conn, &args.database_url)
        .await
        .map_err(ApiError::from)
}

/// 只测试远端连接和迁移，不执行正式同步。
#[tauri::command(rename_all = "camelCase")]
pub async fn test_neon_connection(args: DatabaseUrlArgs) -> Result<(), ApiError> {
    SyncService::test_connection(&args.database_url)
        .await
        .map_err(ApiError::from)
}
