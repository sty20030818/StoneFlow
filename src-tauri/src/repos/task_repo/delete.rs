//! Task 批量软删除/恢复。
//! 重点：任务状态变更后需要同步刷新项目统计，且与批量更新放在同一事务。

use sea_orm::{
    prelude::Expr, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter,
    TransactionTrait,
};

use crate::db::entities::tasks;
use crate::db::now_ms;
use crate::types::error::AppError;

use super::{activity_logs, stats};

/// 按项目 ID 集合软删除任务（不负责开启/提交事务）。
///
/// 重点：
/// - 删除动作与“递归项目收集”解耦，便于在项目删除编排中复用
/// - 只更新未删除任务，避免重复写入
pub async fn soft_delete_by_project_ids<C>(
    conn: &C,
    project_ids: &[String],
    now: i64,
) -> Result<usize, AppError>
where
    C: ConnectionTrait,
{
    if project_ids.is_empty() {
        return Ok(0);
    }

    let mut unique_project_ids = project_ids.to_vec();
    unique_project_ids.sort();
    unique_project_ids.dedup();

    let res = tasks::Entity::update_many()
        .col_expr(tasks::Column::DeletedAt, Expr::value(Some(now)))
        .col_expr(tasks::Column::UpdatedAt, Expr::value(now))
        .filter(tasks::Column::ProjectId.is_in(unique_project_ids))
        .filter(tasks::Column::DeletedAt.is_null())
        .exec(conn)
        .await
        .map_err(AppError::from)?;

    Ok(res.rows_affected as usize)
}

pub async fn delete_many(conn: &DatabaseConnection, ids: &[String]) -> Result<usize, AppError> {
    if ids.is_empty() {
        return Err(AppError::Validation("请选择要删除的任务".to_string()));
    }

    let now = now_ms();
    let txn = conn.begin().await.map_err(AppError::from)?;

    // 1) 先找受影响任务，后续用于日志和刷新统计。
    let task_models = tasks::Entity::find()
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .filter(tasks::Column::DeletedAt.is_null())
        .all(&txn)
        .await
        .map_err(AppError::from)?;

    let project_ids: Vec<String> = task_models
        .iter()
        .filter_map(|m| m.project_id.clone())
        .collect();

    // 2) 批量写 deleted_at，实现软删除。
    let res = tasks::Entity::update_many()
        .col_expr(tasks::Column::DeletedAt, Expr::value(Some(now)))
        .col_expr(tasks::Column::UpdatedAt, Expr::value(now))
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .filter(tasks::Column::DeletedAt.is_null())
        .exec(&txn)
        .await
        .map_err(AppError::from)?;

    let count = res.rows_affected as usize;

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

    // 3) 去重后刷新项目统计。
    let mut unique_pids = project_ids;
    unique_pids.sort();
    unique_pids.dedup();

    for pid in unique_pids {
        stats::refresh_project_stats(&txn, &pid, now).await?;
    }

    txn.commit().await.map_err(AppError::from)?;

    Ok(count)
}

pub async fn restore_many(conn: &DatabaseConnection, ids: &[String]) -> Result<usize, AppError> {
    if ids.is_empty() {
        return Err(AppError::Validation("请选择要恢复的任务".to_string()));
    }

    let now = now_ms();
    let txn = conn.begin().await.map_err(AppError::from)?;

    let task_models = tasks::Entity::find()
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .filter(tasks::Column::DeletedAt.is_not_null())
        .all(&txn)
        .await
        .map_err(AppError::from)?;

    let project_ids: Vec<String> = task_models
        .iter()
        .filter_map(|m| m.project_id.clone())
        .collect();

    let res = tasks::Entity::update_many()
        .col_expr(tasks::Column::DeletedAt, Expr::value(None::<i64>))
        .col_expr(tasks::Column::UpdatedAt, Expr::value(now))
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .filter(tasks::Column::DeletedAt.is_not_null())
        .exec(&txn)
        .await
        .map_err(AppError::from)?;

    let mut unique_pids = project_ids;
    unique_pids.sort();
    unique_pids.dedup();

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

    for pid in unique_pids {
        stats::refresh_project_stats(&txn, &pid, now).await?;
    }

    txn.commit().await.map_err(AppError::from)?;

    Ok(res.rows_affected as usize)
}
