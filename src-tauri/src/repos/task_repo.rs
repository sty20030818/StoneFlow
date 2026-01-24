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
  id, space_id, title, status,
  order_in_list, created_at, started_at, completed_at
FROM tasks
WHERE 1=1
"#,
        );
        let mut ps: Vec<Value> = Vec::new();

        if let Some(space_id) = space_id {
            sql.push_str(" AND space_id = ?\n");
            ps.push(Value::Text(space_id.to_string()));
        }

        if let Some(status) = status {
            sql.push_str(" AND status = ?\n");
            ps.push(Value::Text(status.to_string()));
        }

        if let Some(project_id) = project_id {
            sql.push_str(" AND project_id = ?\n");
            ps.push(Value::Text(project_id.to_string()));
        }

        sql.push_str(" ORDER BY created_at DESC\n");

        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(ps), |row| {
            Ok(TaskDto {
                id: row.get(0)?,
                space_id: row.get(1)?,
                title: row.get(2)?,
                status: row.get(3)?,
                order_in_list: row.get(4)?,
                created_at: row.get(5)?,
                started_at: row.get(6)?,
                completed_at: row.get(7)?,
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
  id, space_id, title, status,
  order_in_list, created_at, started_at, completed_at, project_id
) VALUES (
  ?1, ?2, ?3, ?4,
  ?5, ?6, ?7, NULL, ?8
)
"#,
            params![id, space_id, title, status, order_in_list, now, started_at, project_id],
        )?;

        Ok(TaskDto {
            id,
            space_id: space_id.to_string(),
            title: title.to_string(),
            status: status.to_string(),
            order_in_list,
            created_at: now,
            started_at,
            completed_at: None,
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
