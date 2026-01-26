use rusqlite::{params, types::Value, Connection};
use uuid::Uuid;

use crate::db::now_ms;
use crate::types::{dto::TaskDto, error::AppError};

pub struct TaskRepo;

impl TaskRepo {
    pub fn list(
        conn: &Connection,
        space_id: Option<&str>,
        status: Option<&str>,
        project_id: Option<&str>,
    ) -> Result<Vec<TaskDto>, AppError> {
        let mut sql = String::from(
            r#"
SELECT
  t.id, t.space_id, t.project_id, t.title, t.note, t.status, t.priority,
  t.order_in_list, t.created_at, t.started_at, t.completed_at,
  t.planned_start_at, t.planned_end_at,
  GROUP_CONCAT(tag.name, ',') as tags
FROM tasks t
LEFT JOIN task_tags tt ON t.id = tt.task_id
LEFT JOIN tags tag ON tt.tag_id = tag.id
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

        sql.push_str(" GROUP BY t.id ORDER BY t.created_at DESC\n");

        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(ps), |row| {
            let tags_str: Option<String> = row.get(13)?;
            let tags = if let Some(s) = tags_str {
                if s.is_empty() {
                    Vec::new()
                } else {
                    s.split(',').map(|s| s.to_string()).collect()
                }
            } else {
                Vec::new()
            };

            Ok(TaskDto {
                id: row.get(0)?,
                space_id: row.get(1)?,
                project_id: row.get(2)?,
                title: row.get(3)?,
                note: row.get(4)?,
                status: row.get(5)?,
                priority: row.get(6)?,
                tags,
                order_in_list: row.get(7)?,
                created_at: row.get(8)?,
                started_at: row.get(9)?,
                completed_at: row.get(10)?,
                planned_start_at: row.get(11)?,
                planned_end_at: row.get(12)?,
            })
        })?;

        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        Ok(out)
    }

    pub fn create(
        conn: &Connection,
        space_id: &str,
        title: &str,
        auto_start: bool,
        project_id: Option<&str>,
    ) -> Result<TaskDto, AppError> {
        let title = title.trim();
        if title.is_empty() {
            return Err(AppError::Validation("任务标题不能为空".to_string()));
        }

        let now = now_ms();
        let id = Uuid::new_v4().to_string();
        let started_at = if auto_start { Some(now) } else { None };
        let status = if auto_start { "doing" } else { "todo" };
        let order_in_list = now;

        conn.execute(
            r#"
INSERT INTO tasks(
  id, space_id, project_id, title, note, status, priority,
  order_in_list, created_at, started_at, completed_at,
  planned_start_at, planned_end_at
) VALUES (
  ?1, ?2, ?3, ?4, NULL, ?5, 'P1',
  ?6, ?7, ?8, NULL,
  NULL, NULL
)
"#,
            params![id, space_id, project_id, title, status, order_in_list, now, started_at],
        )?;

        Ok(TaskDto {
            id,
            space_id: space_id.to_string(),
            project_id: project_id.map(|s| s.to_string()),
            title: title.to_string(),
            note: None,
            status: status.to_string(),
            priority: "P1".to_string(),
            tags: Vec::new(),
            order_in_list,
            created_at: now,
            started_at,
            completed_at: None,
            planned_start_at: None,
            planned_end_at: None,
        })
    }

    pub fn complete(conn: &Connection, id: &str) -> Result<(), AppError> {
        let now = now_ms();
        let changed = conn.execute(
            "UPDATE tasks SET status = 'done', completed_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        if changed == 0 {
            return Err(AppError::Validation("任务不存在".to_string()));
        }
        Ok(())
    }

    pub fn update_basic(
        conn: &Connection,
        id: &str,
        title: Option<&str>,
        status: Option<&str>,
    ) -> Result<(), AppError> {
        let mut sets: Vec<&str> = Vec::new();
        let mut ps: Vec<Value> = Vec::new();

        if let Some(title) = title {
            let title = title.trim();
            if title.is_empty() {
                return Err(AppError::Validation("任务标题不能为空".to_string()));
            }
            sets.push("title = ?");
            ps.push(Value::Text(title.to_string()));
        }

        if let Some(status) = status {
            sets.push("status = ?");
            ps.push(Value::Text(status.to_string()));
        }

        if sets.is_empty() {
            return Err(AppError::Validation("没有可更新的字段".to_string()));
        }

        let mut sql = String::from("UPDATE tasks SET ");
        sql.push_str(&sets.join(", "));
        sql.push_str(" WHERE id = ?\n");
        ps.push(Value::Text(id.to_string()));

        let changed = conn.execute(&sql, rusqlite::params_from_iter(ps))?;
        if changed == 0 {
            return Err(AppError::Validation("任务不存在".to_string()));
        }
        Ok(())
    }
}
