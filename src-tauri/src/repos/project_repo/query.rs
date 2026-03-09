//! Project 主表查询原语。

use sea_orm::{ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QueryOrder};

use crate::db::entities::projects;
use crate::types::error::AppError;

pub async fn find_by_id<C>(conn: &C, project_id: &str) -> Result<projects::Model, AppError>
where
    C: ConnectionTrait,
{
    // 查询原语只负责“找到或报不存在”，不在这里承载项目树业务规则。
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
    // 用于批量重排等“找不到就跳过”的场景。
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
    // 供删除子树等用例复用，只返回未软删除节点。
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
    // rank 的计算取决于同一 space + parent 作用域下的尾部位置。
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
