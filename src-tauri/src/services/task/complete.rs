use sea_orm::{DatabaseConnection, IntoActiveModel, Set, TransactionTrait};

use crate::db::{
    entities::sea_orm_active_enums::{DoneReason, TaskStatus},
    now_ms,
};
use crate::repos::task_repo::{activity_logs, mutation, query, stats};
use crate::types::error::AppError;

use super::TaskService;

impl TaskService {
    pub async fn complete(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
        let txn = conn.begin().await.map_err(AppError::from)?;
        let now = now_ms();
        let task = query::find_by_id(&txn, id).await?;

        let mut active_model = task.clone().into_active_model();
        active_model.status = Set(TaskStatus::Done);
        active_model.done_reason = Set(Some(DoneReason::Completed));
        active_model.completed_at = Set(Some(now));
        active_model.updated_at = Set(now);
        mutation::update(&txn, active_model).await?;

        if task.status != TaskStatus::Done {
            activity_logs::append_completed(
                &txn,
                activity_logs::TaskLogCtx {
                    task_id: &task.id,
                    space_id: &task.space_id,
                    project_id: task.project_id.as_deref(),
                    create_by: &task.create_by,
                    created_at: now,
                },
                &task.title,
            )
            .await?;
        }

        if let Some(project_id) = task.project_id.as_deref() {
            stats::refresh_project_stats(&txn, project_id, now).await?;
        }

        txn.commit().await.map_err(AppError::from)?;
        Ok(())
    }
}
