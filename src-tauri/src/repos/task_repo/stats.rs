use rusqlite::{params, Connection};

use crate::types::error::AppError;

pub fn refresh_project_stats(
    conn: &Connection,
    project_id: &str,
    now: i64,
) -> Result<(), AppError> {
    let todo_task_count: i64 = conn.query_row(
        r#"
SELECT COUNT(1)
FROM tasks
WHERE project_id = ?1
  AND status = 'todo'
  AND archived_at IS NULL
  AND deleted_at IS NULL
"#,
        params![project_id],
        |row| row.get(0),
    )?;
    let done_task_count: i64 = conn.query_row(
        r#"
SELECT COUNT(1)
FROM tasks
WHERE project_id = ?1
  AND status = 'done'
  AND archived_at IS NULL
  AND deleted_at IS NULL
"#,
        params![project_id],
        |row| row.get(0),
    )?;

    conn.execute(
        "UPDATE projects SET todo_task_count = ?1, done_task_count = ?2, last_task_updated_at = ?3 WHERE id = ?4",
        params![todo_task_count, done_task_count, now, project_id],
    )?;

    Ok(())
}
