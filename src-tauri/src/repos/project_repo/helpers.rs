//! Project 仓储辅助函数。
//! 重点：将“可复用但不对外暴露”的逻辑集中在 helper，保持主 repo 可读。

use sea_orm::{ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter};

use crate::db::entities::projects;
use crate::repos::{
    link_repo::{self, LinkEntity},
    tag_repo::{self, TagEntity},
};
use crate::types::{dto::ProjectDto, error::AppError};

pub fn compute_status(
    deleted_at: Option<i64>,
    archived_at: Option<i64>,
    todo_task_count: i64,
    done_task_count: i64,
) -> String {
    // deleted 优先级最高，其次 archived，再根据任务计数判断。
    if deleted_at.is_some() {
        return "deleted".to_string();
    }
    if archived_at.is_some() {
        return "archived".to_string();
    }
    if todo_task_count > 0 {
        return "inProgress".to_string();
    }
    if done_task_count > 0 {
        return "done".to_string();
    }
    "inProgress".to_string()
}

pub async fn attach_links(
    conn: &DatabaseConnection,
    projects: &mut [ProjectDto],
) -> Result<(), AppError> {
    // 批量加载后回填，避免 N+1 查询。
    if projects.is_empty() {
        return Ok(());
    }

    let project_ids = projects.iter().map(|p| p.id.clone()).collect::<Vec<_>>();
    let link_map = link_repo::load_links(conn, LinkEntity::Project, &project_ids).await?;
    for project in projects {
        project.links = link_map.get(&project.id).cloned().unwrap_or_default();
    }

    Ok(())
}

pub async fn attach_tags(
    conn: &DatabaseConnection,
    projects: &mut [ProjectDto],
) -> Result<(), AppError> {
    if projects.is_empty() {
        return Ok(());
    }

    let project_ids = projects.iter().map(|p| p.id.clone()).collect::<Vec<_>>();
    let tag_map = tag_repo::load_tags(conn, TagEntity::Project, &project_ids).await?;
    for project in projects {
        project.tags = tag_map.get(&project.id).cloned().unwrap_or_default();
    }

    Ok(())
}

pub async fn build_project_path<C>(
    conn: &C,
    space_id: &str,
    parent_id: Option<&str>,
    title: &str,
) -> Result<String, AppError>
where
    C: ConnectionTrait,
{
    // 重点：path 基于父路径拼接，属于“冗余但高读性能”字段。
    if let Some(parent_id) = parent_id {
        let parent = projects::Entity::find_by_id(parent_id)
            .filter(projects::Column::SpaceId.eq(space_id))
            .filter(projects::Column::DeletedAt.is_null())
            .one(conn)
            .await
            .map_err(AppError::from)?;

        if let Some(p) = parent {
            Ok(format!("{}/{}", p.path, title))
        } else {
            // Fallback or error? Existing code errored if query_row check strictness
            // existing used unwrap or ? on query_row, implies it expects it.
            Err(AppError::Validation("Parent project not found".to_string()))
        }
    } else {
        Ok(format!("/{title}"))
    }
}
