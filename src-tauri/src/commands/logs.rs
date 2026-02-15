//! Activity Logs 命令边界。

use serde::Deserialize;
use tauri::State;

use crate::db::DbState;
use crate::repos::activity_log_repo::{ActivityLogRepo, ListActivityLogsInput};
use crate::types::{dto::ActivityLogDto, error::ApiError};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListActivityLogsArgs {
    pub entity_type: Option<String>,
    pub task_id: Option<String>,
    pub space_id: Option<String>,
    pub project_id: Option<String>,
    pub from: Option<i64>,
    pub to: Option<i64>,
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

#[tauri::command]
pub async fn list_activity_logs(
    state: State<'_, DbState>,
    args: ListActivityLogsArgs,
) -> Result<Vec<ActivityLogDto>, ApiError> {
    ActivityLogRepo::list(
        &state.conn,
        ListActivityLogsInput {
            entity_type: args.entity_type,
            task_id: args.task_id,
            space_id: args.space_id,
            project_id: args.project_id,
            from: args.from,
            to: args.to,
            limit: args.limit,
            offset: args.offset,
        },
    )
    .await
    .map_err(ApiError::from)
}
