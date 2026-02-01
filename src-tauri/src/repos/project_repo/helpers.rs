use rusqlite::{params, Connection};

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

pub fn attach_links(conn: &Connection, projects: &mut [ProjectDto]) -> Result<(), AppError> {
    if projects.is_empty() {
        return Ok(());
    }

    let project_ids = projects.iter().map(|p| p.id.clone()).collect::<Vec<_>>();
    let link_map = link_repo::load_links(conn, LinkEntity::Project, &project_ids)?;
    for project in projects {
        project.links = link_map.get(&project.id).cloned().unwrap_or_default();
    }

    Ok(())
}

pub fn attach_tags(conn: &Connection, projects: &mut [ProjectDto]) -> Result<(), AppError> {
    if projects.is_empty() {
        return Ok(());
    }

    let project_ids = projects.iter().map(|p| p.id.clone()).collect::<Vec<_>>();
    let tag_map = tag_repo::load_tags(conn, TagEntity::Project, &project_ids)?;
    for project in projects {
        project.tags = tag_map.get(&project.id).cloned().unwrap_or_default();
    }

    Ok(())
}

pub fn build_project_path(
    conn: &Connection,
    space_id: &str,
    parent_id: Option<&str>,
    title: &str,
) -> Result<String, AppError> {
    if let Some(parent_id) = parent_id {
        let parent_path: String = conn.query_row(
            "SELECT path FROM projects WHERE id = ?1 AND space_id = ?2",
            params![parent_id, space_id],
            |row| row.get(0),
        )?;
        Ok(format!("{}/{}", parent_path, title))
    } else {
        Ok(format!("/{title}"))
    }
}
