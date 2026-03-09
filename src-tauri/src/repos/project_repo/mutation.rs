//! Project 主表持久化原语。

use sea_orm::{
    prelude::Expr, ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, Set,
};

use crate::db::entities::{projects, sea_orm_active_enums::Priority, tasks};
use crate::types::error::AppError;

pub struct NewProjectRecord {
    pub id: String,
    pub space_id: String,
    pub parent_id: Option<String>,
    pub path: String,
    pub title: String,
    pub note: Option<String>,
    pub priority: Priority,
    pub rank: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub create_by: String,
}

pub async fn insert<C>(conn: &C, record: NewProjectRecord) -> Result<projects::Model, AppError>
where
    C: ConnectionTrait,
{
    projects::ActiveModel {
        id: Set(record.id),
        space_id: Set(record.space_id),
        parent_id: Set(record.parent_id),
        path: Set(record.path),
        title: Set(record.title),
        note: Set(record.note),
        priority: Set(record.priority),
        todo_task_count: Set(0),
        done_task_count: Set(0),
        last_task_updated_at: Set(None),
        created_at: Set(record.created_at),
        updated_at: Set(record.updated_at),
        archived_at: Set(None),
        deleted_at: Set(None),
        create_by: Set(record.create_by),
        rank: Set(record.rank),
    }
    .insert(conn)
    .await
    .map_err(AppError::from)
}

pub async fn update<C>(conn: &C, active_model: projects::ActiveModel) -> Result<projects::Model, AppError>
where
    C: ConnectionTrait,
{
    active_model.update(conn).await.map_err(AppError::from)
}

pub async fn soft_delete_by_ids<C>(
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

    let result = projects::Entity::update_many()
        .col_expr(projects::Column::DeletedAt, Expr::value(Some(now)))
        .col_expr(projects::Column::UpdatedAt, Expr::value(now))
        .filter(projects::Column::Id.is_in(project_ids.iter().cloned()))
        .filter(projects::Column::DeletedAt.is_null())
        .exec(conn)
        .await
        .map_err(AppError::from)?;

    Ok(result.rows_affected as usize)
}

pub async fn update_tasks_space_by_project<C>(
    conn: &C,
    project_id: &str,
    space_id: &str,
    now: i64,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    tasks::Entity::update_many()
        .col_expr(tasks::Column::SpaceId, Expr::value(space_id.to_string()))
        .col_expr(tasks::Column::UpdatedAt, Expr::value(now))
        .filter(tasks::Column::ProjectId.eq(project_id))
        .exec(conn)
        .await
        .map_err(AppError::from)?;

    Ok(())
}

pub async fn rebase_descendant_paths<C>(
    conn: &C,
    space_id: &str,
    old_root_path: &str,
    new_root_path: &str,
    now: i64,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    if old_root_path == new_root_path {
        return Ok(());
    }

    let old_prefix = format!("{old_root_path}/");
    let descendants = projects::Entity::find()
        .filter(projects::Column::SpaceId.eq(space_id))
        .filter(projects::Column::Path.starts_with(old_prefix))
        .all(conn)
        .await
        .map_err(AppError::from)?;

    for model in descendants {
        let suffix = model
            .path
            .strip_prefix(old_root_path)
            .unwrap_or("")
            .to_string();
        let mut active_model: projects::ActiveModel = model.into();
        active_model.path = Set(format!("{new_root_path}{suffix}"));
        active_model.updated_at = Set(now);
        active_model.update(conn).await.map_err(AppError::from)?;
    }

    Ok(())
}
