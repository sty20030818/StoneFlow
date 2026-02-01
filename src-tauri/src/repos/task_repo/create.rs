use rusqlite::params;
use uuid::Uuid;

use crate::db::now_ms;
use crate::types::{dto::TaskDto, error::AppError};

use super::{stats, validations};

pub fn create(
    conn: &rusqlite::Connection,
    space_id: &str,
    title: &str,
    auto_start: bool,
    project_id: Option<&str>,
) -> Result<TaskDto, AppError> {
    let title = validations::trim_and_validate_title(title)?;

    let now = now_ms();
    let id = Uuid::new_v4().to_string();
    let _auto_start = auto_start;
    let status = "todo";
    let rank = 1024;
    let updated_at = now;
    let create_by = "stonefish";

    conn.execute(
        r#"
INSERT INTO tasks(
  id, space_id, project_id, title, note, status, done_reason, priority,
  rank, created_at, updated_at, completed_at, deadline_at, archived_at, deleted_at,
  custom_fields, create_by
) VALUES (
  ?1, ?2, ?3, ?4, NULL, ?5, NULL, 'P1',
  ?6, ?7, ?8, NULL, NULL, NULL, NULL,
  NULL, ?9
)
"#,
        params![id, space_id, project_id, title, status, rank, now, updated_at, create_by],
    )?;

    if let Some(project_id) = project_id {
        stats::refresh_project_stats(conn, project_id, now)?;
    }

    Ok(TaskDto {
        id,
        space_id: space_id.to_string(),
        project_id: project_id.map(|s| s.to_string()),
        title: title.to_string(),
        note: None,
        status: status.to_string(),
        done_reason: None,
        priority: "P1".to_string(),
        tags: Vec::new(),
        rank,
        created_at: now,
        updated_at,
        completed_at: None,
        deadline_at: None,
        archived_at: None,
        deleted_at: None,
        links: Vec::new(),
        custom_fields: None,
        create_by: create_by.to_string(),
    })
}
