use rusqlite::{params, Connection};

use crate::db::now_ms;
use crate::types::{
    dto::{CustomFieldsDto, LinkInputDto, TaskDto},
    error::AppError,
};

pub struct TaskRepo;

pub mod create;
pub mod custom_fields;
pub mod delete;
pub mod links;
pub mod list;
pub mod stats;
pub mod tags;
pub mod update;
pub mod update_builder;
pub mod validations;

pub use create::create;
pub use delete::delete_many;
pub use list::list;
pub use update::update;

impl TaskRepo {
    pub fn list(
        conn: &Connection,
        space_id: Option<&str>,
        status: Option<&str>,
        project_id: Option<&str>,
    ) -> Result<Vec<TaskDto>, AppError> {
        list(conn, space_id, status, project_id)
    }

    pub fn create(
        conn: &Connection,
        space_id: &str,
        title: &str,
        auto_start: bool,
        project_id: Option<&str>,
    ) -> Result<TaskDto, AppError> {
        create(conn, space_id, title, auto_start, project_id)
    }

    pub fn complete(conn: &Connection, id: &str) -> Result<(), AppError> {
        let now = now_ms();
        let project_id: Option<String> = conn
            .query_row(
                "SELECT project_id FROM tasks WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .unwrap_or(None);
        let changed = conn.execute(
            "UPDATE tasks SET status = 'done', done_reason = 'completed', completed_at = ?1, updated_at = ?2 WHERE id = ?3",
            params![now, now, id],
        )?;
        if changed == 0 {
            return Err(AppError::Validation("任务不存在".to_string()));
        }
        if let Some(project_id) = project_id.as_deref() {
            stats::refresh_project_stats(conn, project_id, now)?;
        }
        Ok(())
    }

    pub fn delete_many(conn: &mut Connection, ids: &[String]) -> Result<usize, AppError> {
        delete_many(conn, ids)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn update(
        conn: &mut Connection,
        id: &str,
        title: Option<&str>,
        status: Option<&str>,
        done_reason: Option<Option<&str>>,
        priority: Option<&str>,
        note: Option<Option<&str>>,
        tags: Option<Vec<String>>,
        space_id: Option<&str>,
        project_id: Option<Option<&str>>,
        deadline_at: Option<Option<i64>>,
        rank: Option<i64>,
        links: Option<Vec<LinkInputDto>>,
        custom_fields: Option<Option<CustomFieldsDto>>,
        archived_at: Option<Option<i64>>,
        deleted_at: Option<Option<i64>>,
    ) -> Result<(), AppError> {
        update(
            conn,
            id,
            title,
            status,
            done_reason,
            priority,
            note,
            tags,
            space_id,
            project_id,
            deadline_at,
            rank,
            links,
            custom_fields,
            archived_at,
            deleted_at,
        )
    }
}

impl TaskRepo {
    pub fn task_exists(conn: &Connection, id: &str) -> Result<bool, AppError> {
        let mut stmt = conn.prepare("SELECT 1 FROM tasks WHERE id = ?1 LIMIT 1")?;
        let mut rows = stmt.query(params![id])?;
        Ok(rows.next()?.is_some())
    }
}
