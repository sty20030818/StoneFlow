use crate::db::now_ms;
use crate::types::error::AppError;

pub fn seed_default_projects_and_backfill_tasks(
    conn: &mut rusqlite::Connection,
) -> Result<(), AppError> {
    // 不变量：默认项目 ID 为 "{space_id}_default"，并在同一事务内补齐任务与统计。
    let has_projects_table: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM sqlite_master WHERE type = 'table' AND name = 'projects'",
            (),
            |row| row.get(0),
        )
        .unwrap_or(0);
    if has_projects_table == 0 {
        return Ok(());
    }

    let now = now_ms();
    let tx = conn.transaction()?;

    let mut stmt = tx.prepare("SELECT id, name FROM spaces ORDER BY \"order\" ASC")?;
    let rows = stmt.query_map((), |row| {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        Ok((id, name))
    })?;
    let spaces: Vec<(String, String)> = rows.collect::<Result<Vec<_>, _>>()?;
    drop(stmt);

    for (space_id, _space_name) in spaces {
        let project_id = format!("{space_id}_default");

        let exists: i64 = tx
            .query_row(
                "SELECT COUNT(1) FROM projects WHERE id = ?1",
                (&project_id,),
                |row| row.get(0),
            )
            .unwrap_or(0);

        if exists == 0 {
            let project_title = "Default Project".to_string();
            let path = "/Default Project".to_string();

            tx.execute(
                r#"
INSERT INTO projects(
  id, space_id, parent_id, path,
  title, note, priority,
  todo_task_count, done_task_count, last_task_updated_at,
  created_at, updated_at, archived_at, deleted_at,
  create_by, rank
) VALUES (
  ?1, ?2, NULL, ?3,
  ?4, NULL, 'P1',
  0, 0, NULL,
  ?5, ?5, NULL, NULL,
  'stonefish', 1024
)
"#,
                (
                    project_id.clone(),
                    space_id.clone(),
                    path,
                    project_title,
                    now,
                ),
            )?;
        }

        tx.execute(
            r#"
UPDATE tasks
SET project_id = ?1
WHERE space_id = ?2
  AND project_id IS NULL
"#,
            (&project_id, &space_id),
        )?;

        tx.execute(
            r#"
UPDATE projects
SET todo_task_count = (
    SELECT COUNT(1) FROM tasks t
    WHERE t.project_id = ?1
      AND t.status = 'todo'
      AND t.archived_at IS NULL
      AND t.deleted_at IS NULL
  ),
  done_task_count = (
    SELECT COUNT(1) FROM tasks t
    WHERE t.project_id = ?1
      AND t.status = 'done'
      AND t.archived_at IS NULL
      AND t.deleted_at IS NULL
  ),
  last_task_updated_at = ?2
WHERE id = ?1
"#,
            (&project_id, now),
        )?;
    }

    tx.commit()?;
    Ok(())
}
