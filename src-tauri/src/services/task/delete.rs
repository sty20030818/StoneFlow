//! 任务删除与恢复用例。
//!
//! 这里处理的是软删除语义，因此删除和恢复本质上都是更新状态，
//! 同时要补日志并刷新受影响项目的统计。

use sea_orm::{DatabaseConnection, TransactionTrait};

use crate::db::now_ms;
use crate::repos::task_repo::{activity_logs, mutation, query, stats};
use crate::types::error::AppError;

use super::{helpers::dedup_project_ids, TaskService};

impl TaskService {
    /// 批量软删除任务。
    pub async fn delete_many(conn: &DatabaseConnection, ids: &[String]) -> Result<usize, AppError> {
        if ids.is_empty() {
            return Err(AppError::Validation("请选择要删除的任务".to_string()));
        }

        let txn = conn.begin().await.map_err(AppError::from)?;
        let now = now_ms();
        let task_models = query::find_not_deleted_by_ids(&txn, ids).await?;
        let project_ids: Vec<String> = task_models
            .iter()
            .filter_map(|task| task.project_id.clone())
            .collect();
        // 先批量删，再补日志与统计，避免一条条更新拖慢事务。
        let count = mutation::soft_delete_many(&txn, ids, now).await?;

        for task in &task_models {
            activity_logs::append_deleted(
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

        for project_id in dedup_project_ids(project_ids) {
            stats::refresh_project_stats(&txn, &project_id, now).await?;
        }

        txn.commit().await.map_err(AppError::from)?;
        Ok(count)
    }

    /// 批量恢复已软删除任务。
    pub async fn restore_many(
        conn: &DatabaseConnection,
        ids: &[String],
    ) -> Result<usize, AppError> {
        if ids.is_empty() {
            return Err(AppError::Validation("请选择要恢复的任务".to_string()));
        }

        let txn = conn.begin().await.map_err(AppError::from)?;
        let now = now_ms();
        let task_models = query::find_deleted_by_ids(&txn, ids).await?;
        let project_ids: Vec<String> = task_models
            .iter()
            .filter_map(|task| task.project_id.clone())
            .collect();
        let count = mutation::restore_many(&txn, ids, now).await?;

        for task in &task_models {
            activity_logs::append_restored(
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

        for project_id in dedup_project_ids(project_ids) {
            stats::refresh_project_stats(&txn, &project_id, now).await?;
        }

        txn.commit().await.map_err(AppError::from)?;
        Ok(count)
    }
}
