use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::db::now_ms;
use crate::repos::common_task_utils;
use crate::types::{dto::ProjectDto, error::AppError};

pub mod helpers;

pub struct ProjectRepo;

impl ProjectRepo {
    /// 列出某个 Space 下的所有 Project，按 path 排序（用于构建树 & Project Tree）。
    pub fn list_by_space(conn: &Connection, space_id: &str) -> Result<Vec<ProjectDto>, AppError> {
        let mut stmt = conn.prepare(
            r#"
SELECT
  p.id,
  p.space_id,
  p.parent_id,
  p.path,
  p.title,
  p.note,
  p.priority,
  p.todo_task_count,
  p.done_task_count,
  p.last_task_updated_at,
  p.created_at,
  p.updated_at,
  p.archived_at,
  p.deleted_at,
  p.create_by,
  p.rank
FROM projects p
WHERE p.space_id = ?1
ORDER BY p.path ASC
"#,
        )?;

        let rows = stmt.query_map((space_id,), |row| {
            let archived_at: Option<i64> = row.get(12)?;
            let deleted_at: Option<i64> = row.get(13)?;
            let todo_task_count: i64 = row.get(7)?;
            let done_task_count: i64 = row.get(8)?;
            let computed_status =
                helpers::compute_status(deleted_at, archived_at, todo_task_count, done_task_count);
            Ok(ProjectDto {
                id: row.get(0)?,
                space_id: row.get(1)?,
                parent_id: row.get(2)?,
                path: row.get(3)?,
                title: row.get(4)?,
                note: row.get(5)?,
                priority: row.get(6)?,
                todo_task_count,
                done_task_count,
                last_task_updated_at: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                archived_at,
                deleted_at,
                create_by: row.get(14)?,
                rank: row.get(15)?,
                computed_status,
                tags: Vec::new(),
                links: Vec::new(),
            })
        })?;

        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        helpers::attach_links(conn, &mut out)?;
        helpers::attach_tags(conn, &mut out)?;
        Ok(out)
    }

    /// 获取默认 Project（每个 Space 都有一个名为 "{SpaceName} · Default" 的默认项目）。
    /// 注意：Default Project 应该在数据库初始化时创建，如果不存在则返回错误。
    pub fn get_default_project(conn: &Connection, space_id: &str) -> Result<ProjectDto, AppError> {
        let default_id = format!("{space_id}_default");

        let mut project = conn
            .query_row(
            r#"
SELECT
  p.id, p.space_id, p.parent_id, p.path, p.title, p.note, p.priority,
  p.todo_task_count, p.done_task_count, p.last_task_updated_at,
  p.created_at, p.updated_at, p.archived_at, p.deleted_at,
  p.create_by, p.rank
FROM projects p
WHERE p.id = ?1
"#,
            (&default_id,),
            |row| {
                let archived_at: Option<i64> = row.get(12)?;
                let deleted_at: Option<i64> = row.get(13)?;
                let todo_task_count: i64 = row.get(7)?;
                let done_task_count: i64 = row.get(8)?;
                let computed_status =
                    helpers::compute_status(deleted_at, archived_at, todo_task_count, done_task_count);
                Ok(ProjectDto {
                    id: row.get(0)?,
                    space_id: row.get(1)?,
                    parent_id: row.get(2)?,
                    path: row.get(3)?,
                    title: row.get(4)?,
                    note: row.get(5)?,
                    priority: row.get(6)?,
                    todo_task_count,
                    done_task_count,
                    last_task_updated_at: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                    archived_at,
                    deleted_at,
                    create_by: row.get(14)?,
                    rank: row.get(15)?,
                    computed_status,
                    tags: Vec::new(),
                    links: Vec::new(),
                })
            },
        )
        .map_err(|e| {
            if let rusqlite::Error::QueryReturnedNoRows = e {
                AppError::Validation(format!(
                    "Default project for space '{}' not found. Please ensure database is properly initialized.",
                    space_id
                ))
            } else {
                AppError::from(e)
            }
        })?;

        helpers::attach_links(conn, std::slice::from_mut(&mut project))?;
        helpers::attach_tags(conn, std::slice::from_mut(&mut project))?;

        Ok(project)
    }

    /// 创建新项目。
    pub fn create(
        conn: &Connection,
        space_id: &str,
        title: &str,
        parent_id: Option<&str>,
        note: Option<&str>,
        priority: Option<&str>,
    ) -> Result<ProjectDto, AppError> {
        let title = title.trim();
        if title.is_empty() {
            return Err(AppError::Validation("项目名称不能为空".to_string()));
        }

        let priority = common_task_utils::normalize_priority(priority.unwrap_or("P1"));
        common_task_utils::validate_priority(&priority)?;

        let path = helpers::build_project_path(conn, space_id, parent_id, title)?;

        let now = now_ms();
        let id = Uuid::new_v4().to_string();

        conn.execute(
            r#"
INSERT INTO projects(
  id, space_id, parent_id, path,
  title, note, priority,
  todo_task_count, done_task_count, last_task_updated_at,
  created_at, updated_at, archived_at, deleted_at,
  create_by, rank
) VALUES (
  ?1, ?2, ?3, ?4,
  ?5, ?6, ?7,
  0, 0, NULL,
  ?8, ?8, NULL, NULL,
  'stonefish', 1024
)
"#,
            params![id, space_id, parent_id, path, title, note, priority, now],
        )?;

        let computed_status = helpers::compute_status(None, None, 0, 0);

        Ok(ProjectDto {
            id,
            space_id: space_id.to_string(),
            parent_id: parent_id.map(|s| s.to_string()),
            path,
            title: title.to_string(),
            note: note.map(|s| s.to_string()),
            priority,
            todo_task_count: 0,
            done_task_count: 0,
            last_task_updated_at: None,
            created_at: now,
            updated_at: now,
            archived_at: None,
            deleted_at: None,
            create_by: "stonefish".to_string(),
            rank: 1024,
            computed_status,
            tags: Vec::new(),
            links: Vec::new(),
        })
    }
}
