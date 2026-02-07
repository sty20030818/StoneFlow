//! Task 批量软删除/恢复。
//! 重点：任务状态变更后需要同步刷新项目统计，且与批量更新放在同一事务。

use sea_orm::{
    prelude::Expr, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect,
    TransactionTrait,
};

use crate::db::entities::tasks;
use crate::db::now_ms;
use crate::types::error::AppError;

use super::stats;

pub async fn delete_many(conn: &DatabaseConnection, ids: &[String]) -> Result<usize, AppError> {
    if ids.is_empty() {
        return Err(AppError::Validation("请选择要删除的任务".to_string()));
    }

    let now = now_ms();
    let txn = conn.begin().await.map_err(AppError::from)?;

    // 1) 先找受影响的项目 ID，后续刷新统计使用。
    let project_ids: Vec<String> = tasks::Entity::find()
        .select_only()
        .column(tasks::Column::ProjectId)
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .filter(tasks::Column::ProjectId.is_not_null())
        .into_tuple()
        .all(&txn)
        .await
        .map_err(AppError::from)?;

    // 2) 批量写 deleted_at，实现软删除。
    let res = tasks::Entity::update_many()
        .col_expr(tasks::Column::DeletedAt, Expr::value(Some(now)))
        .col_expr(tasks::Column::UpdatedAt, Expr::value(now))
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .exec(&txn)
        .await
        .map_err(AppError::from)?;

    let count = res.rows_affected as usize;

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

    let project_ids: Vec<String> = tasks::Entity::find()
        .select_only()
        .column(tasks::Column::ProjectId)
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .filter(tasks::Column::ProjectId.is_not_null())
        .into_tuple()
        .all(&txn)
        .await
        .map_err(AppError::from)?;

    let res = tasks::Entity::update_many()
        .col_expr(tasks::Column::DeletedAt, Expr::value(None::<i64>))
        .col_expr(tasks::Column::UpdatedAt, Expr::value(now))
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .exec(&txn)
        .await
        .map_err(AppError::from)?;

    let mut unique_pids = project_ids;
    unique_pids.sort();
    unique_pids.dedup();

    for pid in unique_pids {
        stats::refresh_project_stats(&txn, &pid, now).await?;
    }

    txn.commit().await.map_err(AppError::from)?;

    Ok(res.rows_affected as usize)
}
