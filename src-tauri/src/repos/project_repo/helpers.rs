use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};

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

pub async fn build_project_path(
    conn: &DatabaseConnection,
    space_id: &str,
    parent_id: Option<&str>,
    title: &str,
) -> Result<String, AppError> {
    if let Some(parent_id) = parent_id {
        let parent = projects::Entity::find_by_id(parent_id)
            .filter(projects::Column::SpaceId.eq(space_id))
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
