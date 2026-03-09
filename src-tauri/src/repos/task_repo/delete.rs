//! Task 删除原语。
//! 重点：repo 只保留供 service 复用的底层删除写入，不承载批量业务流程。

use sea_orm::{prelude::Expr, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter};

use crate::db::entities::tasks;
use crate::types::error::AppError;

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
