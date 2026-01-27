use std::collections::HashSet;

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
  t.order_in_list, t.created_at, t.started_at, t.completed_at, t.project_path,
  GROUP_CONCAT(tag.name, ',') as tags, t.planned_end_date
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
            let tags_str: Option<String> = row.get(12)?;
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
                project_path: row.get(11)?,
                planned_end_date: row.get(13)?,
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
  order_in_list, created_at, started_at, completed_at, planned_end_date
) VALUES (
  ?1, ?2, ?3, ?4, NULL, ?5, 'P1',
  ?6, ?7, ?8, NULL, NULL
)
"#,
            params![
                id,
                space_id,
                project_id,
                title,
                status,
                order_in_list,
                now,
                started_at
            ],
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
            project_path: None,
            planned_end_date: None,
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

    pub fn delete_many(conn: &mut Connection, ids: &[String]) -> Result<usize, AppError> {
        if ids.is_empty() {
            return Err(AppError::Validation("请选择要删除的任务".to_string()));
        }

        let tx = conn.transaction()?;

        let mut placeholders = String::new();
        let mut params: Vec<Value> = Vec::with_capacity(ids.len());
        for (idx, id) in ids.iter().enumerate() {
            if idx > 0 {
                placeholders.push_str(", ");
            }
            placeholders.push('?');
            params.push(Value::Text(id.to_string()));
        }

        let sql = format!("DELETE FROM tasks WHERE id IN ({})", placeholders);
        let changed = tx.execute(&sql, rusqlite::params_from_iter(params))?;

        tx.commit()?;
        Ok(changed)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn update(
        conn: &mut Connection,
        id: &str,
        title: Option<&str>,
        status: Option<&str>,
        priority: Option<&str>,
        note: Option<Option<&str>>,
        tags: Option<Vec<String>>,
        project_path: Option<Option<&str>>,
        space_id: Option<&str>,
        project_id: Option<Option<&str>>,
        planned_end_date: Option<Option<i64>>,
    ) -> Result<(), AppError> {
        let tx = conn.transaction()?;

        if !Self::task_exists(&tx, id)? {
            return Err(AppError::Validation("任务不存在".to_string()));
        }

        let mut sets: Vec<&str> = Vec::new();
        let mut ps: Vec<Value> = Vec::new();
        let mut changed_any = false;

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

        if let Some(priority) = priority {
            if !["P0", "P1", "P2", "P3"].contains(&priority) {
                return Err(AppError::Validation(
                    "优先级必须是 P0, P1, P2 或 P3".to_string(),
                ));
            }
            sets.push("priority = ?");
            ps.push(Value::Text(priority.to_string()));
        }

        if let Some(note) = note {
            match note.map(str::trim).filter(|v| !v.is_empty()) {
                Some(value) => {
                    sets.push("note = ?");
                    ps.push(Value::Text(value.to_string()));
                }
                None => {
                    sets.push("note = NULL");
                }
            }
        }

        if let Some(project_path) = project_path {
            match project_path.map(str::trim).filter(|v| !v.is_empty()) {
                Some(value) => {
                    sets.push("project_path = ?");
                    ps.push(Value::Text(value.to_string()));
                }
                None => {
                    sets.push("project_path = NULL");
                }
            }
        }

        if let Some(space_id) = space_id {
            sets.push("space_id = ?");
            ps.push(Value::Text(space_id.to_string()));
        }

        if let Some(project_id) = project_id {
            match project_id {
                Some(value) => {
                    sets.push("project_id = ?");
                    ps.push(Value::Text(value.to_string()));
                }
                None => {
                    sets.push("project_id = NULL");
                }
            }
        }

        if let Some(planned_end_date) = planned_end_date {
            match planned_end_date {
                Some(value) => {
                    sets.push("planned_end_date = ?");
                    ps.push(Value::Integer(value));
                }
                None => {
                    sets.push("planned_end_date = NULL");
                }
            }
        }

        if !sets.is_empty() {
            let mut sql = String::from("UPDATE tasks SET ");
            sql.push_str(&sets.join(", "));
            sql.push_str(" WHERE id = ?\n");
            ps.push(Value::Text(id.to_string()));

            let changed = tx.execute(&sql, rusqlite::params_from_iter(ps))?;
            if changed == 0 {
                return Err(AppError::Validation("任务不存在".to_string()));
            }
            changed_any = true;
        }

        if let Some(tags) = tags {
            Self::sync_tags(&tx, id, &tags)?;
            changed_any = true;
        }

        if !changed_any {
            return Err(AppError::Validation("没有可更新的字段".to_string()));
        }

        tx.commit()?;
        Ok(())
    }

    fn task_exists(conn: &Connection, id: &str) -> Result<bool, AppError> {
        let mut stmt = conn.prepare("SELECT 1 FROM tasks WHERE id = ?1 LIMIT 1")?;
        let mut rows = stmt.query(params![id])?;
        Ok(rows.next()?.is_some())
    }

    fn sync_tags(conn: &Connection, task_id: &str, tags: &[String]) -> Result<(), AppError> {
        let now = now_ms();
        let default_color = "#94a3b8";

        let mut seen = HashSet::new();
        let normalized: Vec<String> = tags
            .iter()
            .map(|t| t.trim())
            .filter(|t| !t.is_empty())
            .filter(|t| seen.insert(t.to_string()))
            .map(|t| t.to_string())
            .collect();

        conn.execute("DELETE FROM task_tags WHERE task_id = ?1", params![task_id])?;

        for name in normalized {
            let tag_id = Self::ensure_tag(conn, &name, default_color, now)?;
            conn.execute(
                "INSERT OR IGNORE INTO task_tags(task_id, tag_id) VALUES (?1, ?2)",
                params![task_id, tag_id],
            )?;
        }

        Ok(())
    }

    fn ensure_tag(
        conn: &Connection,
        name: &str,
        color: &str,
        created_at: i64,
    ) -> Result<String, AppError> {
        let existing: Result<String, rusqlite::Error> = conn.query_row(
            "SELECT id FROM tags WHERE name = ?1 LIMIT 1",
            params![name],
            |row| row.get(0),
        );

        match existing {
            Ok(id) => Ok(id),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                let id = Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO tags(id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
                    params![id, name, color, created_at],
                )?;
                Ok(id)
            }
            Err(err) => Err(err.into()),
        }
    }
}
