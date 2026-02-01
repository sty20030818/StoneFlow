use rusqlite::{types::Value, Connection};

use crate::types::{dto::TaskDto, error::AppError};

use super::{custom_fields, links, tags};

pub fn list(
    conn: &Connection,
    space_id: Option<&str>,
    status: Option<&str>,
    project_id: Option<&str>,
) -> Result<Vec<TaskDto>, AppError> {
    let mut sql = String::from(
        r#"
SELECT
  t.id, t.space_id, t.project_id, t.title, t.note, t.status, t.done_reason, t.priority,
  t.rank, t.created_at, t.updated_at, t.completed_at, t.deadline_at, t.archived_at,
  t.deleted_at, t.custom_fields, t.create_by
FROM tasks t
WHERE 1=1
"#,
    );
    let mut ps: Vec<Value> = Vec::new();

    if let Some(space_id) = space_id {
        sql.push_str(" AND t.space_id = ?\n");
        ps.push(Value::Text(space_id.to_string()));
    }

    if let Some(status) = status {
        sql.push_str(" AND t.status = ?\n");
        ps.push(Value::Text(status.to_string()));
    }

    if let Some(project_id) = project_id {
        sql.push_str(" AND t.project_id = ?\n");
        ps.push(Value::Text(project_id.to_string()));
    }

    sql.push_str(" ORDER BY t.rank DESC, t.created_at DESC\n");

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(rusqlite::params_from_iter(ps), |row| {
        let custom_fields = custom_fields::parse_custom_fields(row.get(15)?);

        Ok(TaskDto {
            id: row.get(0)?,
            space_id: row.get(1)?,
            project_id: row.get(2)?,
            title: row.get(3)?,
            note: row.get(4)?,
            status: row.get(5)?,
            done_reason: row.get(6)?,
            priority: row.get(7)?,
            tags: Vec::new(),
            rank: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
            completed_at: row.get(11)?,
            deadline_at: row.get(12)?,
            archived_at: row.get(13)?,
            deleted_at: row.get(14)?,
            links: Vec::new(),
            custom_fields,
            create_by: row.get(16)?,
        })
    })?;

    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }

    if !out.is_empty() {
        let task_ids = out.iter().map(|t| t.id.clone()).collect::<Vec<_>>();
        let tag_map = tags::load_tags_for_tasks(conn, &task_ids)?;
        let link_map = links::load_links_for_tasks(conn, &task_ids)?;
        for task in &mut out {
            task.links = link_map.get(&task.id).cloned().unwrap_or_default();
            task.tags = tag_map.get(&task.id).cloned().unwrap_or_default();
        }
    }

    Ok(out)
}
