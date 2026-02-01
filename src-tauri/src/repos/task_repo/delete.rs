use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect, TransactionTrait,
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

    // 1. 获取受影响的 Project ID
    let project_ids: Vec<String> = tasks::Entity::find()
        .select_only()
        .column(tasks::Column::ProjectId)
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .filter(tasks::Column::ProjectId.is_not_null())
        .into_tuple()
        .all(&txn)
        .await
        .map_err(AppError::from)?;

    // 2. 删除任务
    let res = tasks::Entity::delete_many()
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .exec(&txn)
        .await
        .map_err(AppError::from)?;

    let count = res.rows_affected as usize;

    // 3. 刷新统计
    // 去重 project_ids
    let mut unique_pids = project_ids;
    unique_pids.sort();
    unique_pids.dedup();

    for pid in unique_pids {
        stats::refresh_project_stats(&txn, &pid, now).await?;
    }

    txn.commit().await.map_err(AppError::from)?;

    Ok(count)
}
