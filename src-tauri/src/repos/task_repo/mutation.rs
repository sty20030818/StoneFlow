//! Task 主表持久化原语。
//!
//! 这里仅负责单次写入或批量字段更新，不负责业务流程编排。

use sea_orm::{
    prelude::Expr, ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, Set,
};

use crate::db::entities::{
    sea_orm_active_enums::{DoneReason, Priority, TaskStatus},
    tasks,
};
use crate::types::error::AppError;

pub struct NewTaskRecord {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub status: TaskStatus,
    pub done_reason: Option<DoneReason>,
    pub priority: Priority,
    pub rank: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub completed_at: Option<i64>,
    pub deadline_at: Option<i64>,
    pub archived_at: Option<i64>,
    pub deleted_at: Option<i64>,
    pub custom_fields: Option<String>,
    pub create_by: String,
}

/// 插入一条新任务记录。
pub async fn insert<C>(conn: &C, record: NewTaskRecord) -> Result<tasks::Model, AppError>
where
    C: ConnectionTrait,
{
    tasks::ActiveModel {
        id: Set(record.id),
        space_id: Set(record.space_id),
        project_id: Set(record.project_id),
        title: Set(record.title),
        note: Set(record.note),
        status: Set(record.status),
        done_reason: Set(record.done_reason),
        priority: Set(record.priority),
        rank: Set(record.rank),
        created_at: Set(record.created_at),
        updated_at: Set(record.updated_at),
        completed_at: Set(record.completed_at),
        deadline_at: Set(record.deadline_at),
        archived_at: Set(record.archived_at),
        deleted_at: Set(record.deleted_at),
        custom_fields: Set(record.custom_fields),
        create_by: Set(record.create_by),
    }
    .insert(conn)
    .await
    .map_err(AppError::from)
}

/// 更新任务主表。
pub async fn update<C>(conn: &C, active_model: tasks::ActiveModel) -> Result<tasks::Model, AppError>
where
    C: ConnectionTrait,
{
    active_model.update(conn).await.map_err(AppError::from)
}

/// 批量软删除任务。
///
/// repo 层只负责字段更新，不负责日志和统计副作用。
pub async fn soft_delete_many<C>(conn: &C, ids: &[String], now: i64) -> Result<usize, AppError>
where
    C: ConnectionTrait,
{
    let result = tasks::Entity::update_many()
        .col_expr(tasks::Column::DeletedAt, Expr::value(Some(now)))
        .col_expr(tasks::Column::UpdatedAt, Expr::value(now))
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .filter(tasks::Column::DeletedAt.is_null())
        .exec(conn)
        .await
        .map_err(AppError::from)?;

    Ok(result.rows_affected as usize)
}

/// 批量恢复已软删除任务。
pub async fn restore_many<C>(conn: &C, ids: &[String], now: i64) -> Result<usize, AppError>
where
    C: ConnectionTrait,
{
    let result = tasks::Entity::update_many()
        .col_expr(tasks::Column::DeletedAt, Expr::value(None::<i64>))
        .col_expr(tasks::Column::UpdatedAt, Expr::value(now))
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .filter(tasks::Column::DeletedAt.is_not_null())
        .exec(conn)
        .await
        .map_err(AppError::from)?;

    Ok(result.rows_affected as usize)
}
