use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait, QueryFilter, Set,
};

use crate::db::entities::{projects, sea_orm_active_enums::TaskStatus, tasks};
use crate::types::error::AppError;

pub async fn refresh_project_stats<C>(conn: &C, project_id: &str, now: i64) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    let todo_task_count = tasks::Entity::find()
        .filter(tasks::Column::ProjectId.eq(project_id))
        .filter(tasks::Column::Status.eq(TaskStatus::Todo))
        .filter(tasks::Column::ArchivedAt.is_null())
        .filter(tasks::Column::DeletedAt.is_null())
        .count(conn)
        .await
        .map_err(AppError::from)?;

    let done_task_count = tasks::Entity::find()
        .filter(tasks::Column::ProjectId.eq(project_id))
        .filter(tasks::Column::Status.eq(TaskStatus::Done))
        .filter(tasks::Column::ArchivedAt.is_null())
        .filter(tasks::Column::DeletedAt.is_null())
        .count(conn)
        .await
        .map_err(AppError::from)?;

    let project = projects::ActiveModel {
        id: Set(project_id.to_string()),
        todo_task_count: Set(todo_task_count as i64),
        done_task_count: Set(done_task_count as i64),
        last_task_updated_at: Set(Some(now)),
        ..Default::default()
    };

    project.update(conn).await.map_err(AppError::from)?;

    Ok(())
}
