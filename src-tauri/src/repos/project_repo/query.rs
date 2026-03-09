//! Project 主表查询原语。

use sea_orm::{ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QueryOrder};

use crate::db::entities::projects;
use crate::types::error::AppError;

pub async fn find_by_id<C>(conn: &C, project_id: &str) -> Result<projects::Model, AppError>
where
    C: ConnectionTrait,
{
    projects::Entity::find_by_id(project_id)
        .one(conn)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError::Validation(format!("项目 {} 不存在", project_id)))
}

pub async fn find_optional_by_id<C>(
    conn: &C,
    project_id: &str,
) -> Result<Option<projects::Model>, AppError>
where
    C: ConnectionTrait,
{
    projects::Entity::find_by_id(project_id)
        .one(conn)
        .await
        .map_err(AppError::from)
}

pub async fn find_not_deleted_by_ids<C>(
    conn: &C,
    project_ids: &[String],
) -> Result<Vec<projects::Model>, AppError>
where
    C: ConnectionTrait,
{
    projects::Entity::find()
        .filter(projects::Column::Id.is_in(project_ids.iter().cloned()))
        .filter(projects::Column::DeletedAt.is_null())
        .all(conn)
        .await
        .map_err(AppError::from)
}

pub async fn next_rank_in_scope<C>(
    conn: &C,
    space_id: &str,
    parent_id: Option<&str>,
) -> Result<i64, AppError>
where
    C: ConnectionTrait,
{
    let mut query = projects::Entity::find()
        .filter(projects::Column::SpaceId.eq(space_id))
        .filter(projects::Column::DeletedAt.is_null());
    if let Some(parent_id) = parent_id {
        query = query.filter(projects::Column::ParentId.eq(parent_id));
    } else {
        query = query.filter(projects::Column::ParentId.is_null());
    }

    let max_rank_project = query
        .order_by_desc(projects::Column::Rank)
        .one(conn)
        .await
        .map_err(AppError::from)?;

    Ok(max_rank_project
        .map(|project| project.rank + 1024)
        .unwrap_or(1024))
}
