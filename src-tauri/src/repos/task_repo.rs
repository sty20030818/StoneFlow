use rusqlite::{params, types::Value, Connection};
use uuid::Uuid;

use crate::db::now_ms;
use crate::types::{dto::TaskDto, error::AppError};

/// project_id 的过滤方式：
/// - Any：不按 project 过滤
/// - Null：只取未归档到项目（project_id IS NULL）
/// - Eq：只取某个项目下的任务
pub enum ProjectIdFilter<'a> {
    Any,
    Null,
    Eq(&'a str),
}

pub struct TaskRepo;

impl TaskRepo {
    pub fn list(
        conn: &Connection,
        space_id: Option<&str>,
        project_id_filter: ProjectIdFilter<'_>,
        status: Option<&str>,
    ) -> Result<Vec<TaskDto>, AppError> {
        let mut sql = String::from(
            r#"
SELECT
  id, space_id, project_id, title, note, status,
  priority, due_at, order_in_list,
  created_at, started_at, completed_at,
  timeline_edited_at, timeline_edit_reason
FROM tasks
WHERE 1=1
"#,
        );
        let mut ps: Vec<Value> = Vec::new();

        if let Some(space_id) = space_id {
            sql.push_str(" AND space_id = ?\n");
            ps.push(Value::Text(space_id.to_string()));
        }

        match project_id_filter {
            ProjectIdFilter::Any => {}
            ProjectIdFilter::Null => {
                sql.push_str(" AND project_id IS NULL\n");
            }
            ProjectIdFilter::Eq(pid) => {
                sql.push_str(" AND project_id = ?\n");
                ps.push(Value::Text(pid.to_string()));
            }
        }

        if let Some(status) = status {
            sql.push_str(" AND status = ?\n");
            ps.push(Value::Text(status.to_string()));
        }

        // M1：排序先简单，后续再扩展
        sql.push_str(" ORDER BY created_at DESC\n");

        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(ps), |row| {
            Ok(TaskDto {
                id: row.get(0)?,
                space_id: row.get(1)?,
                project_id: row.get(2)?,
                title: row.get(3)?,
                note: row.get(4)?,
                status: row.get(5)?,
                priority: row.get(6)?,
                due_at: row.get(7)?,
                order_in_list: row.get(8)?,
                created_at: row.get(9)?,
                started_at: row.get(10)?,
                completed_at: row.get(11)?,
                timeline_edited_at: row.get(12)?,
                timeline_edit_reason: row.get(13)?,
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
        project_id: Option<&str>,
        title: &str,
        note: Option<&str>,
        auto_start: bool,
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
  id, space_id, project_id, title, note, status,
  priority, due_at, order_in_list,
  created_at, started_at, completed_at,
  timeline_edited_at, timeline_edit_reason
) VALUES (
  ?1, ?2, ?3, ?4, ?5, ?6,
  NULL, NULL, ?7,
  ?8, ?9, NULL,
  NULL, NULL
)
"#,
            params![
                id,
                space_id,
                project_id,
                title,
                note,
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
            note: note.map(|s| s.to_string()),
            status: status.to_string(),
            priority: None,
            due_at: None,
            order_in_list,
            created_at: now,
            started_at,
            completed_at: None,
            timeline_edited_at: None,
            timeline_edit_reason: None,
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
        note: Option<Option<&str>>,
        status: Option<&str>,
        project_id: Option<Option<&str>>,
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

        if let Some(note) = note {
            sets.push("note = ?");
            ps.push(match note {
                Some(v) => Value::Text(v.to_string()),
                None => Value::Null,
            });
        }

        if let Some(status) = status {
            sets.push("status = ?");
            ps.push(Value::Text(status.to_string()));
        }

        if let Some(project_id) = project_id {
            sets.push("project_id = ?");
            ps.push(match project_id {
                Some(v) => Value::Text(v.to_string()),
                None => Value::Null,
            });
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

    pub fn update_timeline_strict(
        conn: &Connection,
        id: &str,
        created_at: Option<i64>,
        started_at: Option<Option<i64>>,
        reason: &str,
    ) -> Result<(), AppError> {
        let reason = reason.trim();
        if reason.is_empty() {
            return Err(AppError::Validation("请填写修改原因".to_string()));
        }

        let now = now_ms();
        if let Some(v) = created_at {
            if v > now {
                return Err(AppError::Validation(
                    "created_at 不能设置到未来".to_string(),
                ));
            }
        }
        if let Some(Some(v)) = started_at {
            if v > now {
                return Err(AppError::Validation(
                    "started_at 不能设置到未来".to_string(),
                ));
            }
        }

        // 读取当前值，用于组合校验（started >= created）。
        let (cur_created_at, cur_started_at): (i64, Option<i64>) = conn.query_row(
            "SELECT created_at, started_at FROM tasks WHERE id = ?1",
            [id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;

        let next_created_at = created_at.unwrap_or(cur_created_at);
        let next_started_at = match started_at {
            None => cur_started_at,
            Some(v) => v,
        };

        if let Some(s) = next_started_at {
            if s < next_created_at {
                return Err(AppError::Validation(
                    "started_at 不能早于 created_at".to_string(),
                ));
            }
        }

        let mut sets: Vec<&str> = Vec::new();
        let mut ps: Vec<Value> = Vec::new();

        if let Some(v) = created_at {
            sets.push("created_at = ?");
            ps.push(Value::Integer(v));
        }
        if let Some(v) = started_at {
            sets.push("started_at = ?");
            ps.push(match v {
                Some(v) => Value::Integer(v),
                None => Value::Null,
            });
        }

        // 即使只改 reason，也允许走一次（用于留痕）；但 M1 先要求至少改一个字段。
        if sets.is_empty() {
            return Err(AppError::Validation("请至少修改一个时间字段".to_string()));
        }

        sets.push("timeline_edited_at = ?");
        ps.push(Value::Integer(now));
        sets.push("timeline_edit_reason = ?");
        ps.push(Value::Text(reason.to_string()));

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
