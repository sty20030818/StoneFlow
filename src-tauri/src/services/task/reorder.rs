use sea_orm::DatabaseConnection;

use crate::types::error::AppError;

use super::{
    dto::{TaskUpdateInput, TaskUpdatePatch},
    TaskService,
};

impl TaskService {
    pub async fn reorder(
        conn: &DatabaseConnection,
        task_id: String,
        new_rank: i64,
    ) -> Result<(), AppError> {
        Self::update(
            conn,
            TaskUpdateInput {
                id: task_id,
                patch: TaskUpdatePatch::rank_only(new_rank),
            },
        )
        .await
    }

    pub async fn rebalance(
        conn: &DatabaseConnection,
        task_ids: &[String],
        step: i64,
    ) -> Result<(), AppError> {
        for (index, task_id) in task_ids.iter().enumerate() {
            let new_rank = (index as i64) * step;
            Self::reorder(conn, task_id.clone(), new_rank).await?;
        }
        Ok(())
    }
}
