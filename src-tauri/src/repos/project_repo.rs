use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::db::now_ms;
use crate::types::{dto::ProjectDto, error::AppError};

pub struct ProjectRepo;

impl ProjectRepo {
    /// 列出某个 Space 下的所有 Project，按 path 排序（用于构建树 & Project Tree）。
    pub fn list_by_space(conn: &Connection, space_id: &str) -> Result<Vec<ProjectDto>, AppError> {
        let mut stmt = conn.prepare(
            r#"
SELECT
  id,
  space_id,
  parent_id,
  path,
  name,
  note,
  status,
  created_at,
  updated_at,
  archived_at
FROM projects
WHERE space_id = ?1
ORDER BY path ASC
"#,
        )?;

        let rows = stmt.query_map((space_id,), |row| {
            Ok(ProjectDto {
                id: row.get(0)?,
                space_id: row.get(1)?,
                parent_id: row.get(2)?,
                path: row.get(3)?,
                name: row.get(4)?,
                note: row.get(5)?,
                status: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                archived_at: row.get(9)?,
            })
        })?;

        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        Ok(out)
    }

    /// 获取默认 Project（每个 Space 都有一个名为 "{SpaceName} · Default" 的默认项目）。
    /// 注意：Default Project 应该在数据库初始化时创建，如果不存在则返回错误。
    pub fn get_default_project(conn: &Connection, space_id: &str) -> Result<ProjectDto, AppError> {
        let default_id = format!("{space_id}_default");

        conn.query_row(
            r#"
SELECT
  id, space_id, parent_id, path, name, note, status,
  created_at, updated_at, archived_at
FROM projects
WHERE id = ?1
"#,
            (&default_id,),
            |row| {
                Ok(ProjectDto {
                    id: row.get(0)?,
                    space_id: row.get(1)?,
                    parent_id: row.get(2)?,
                    path: row.get(3)?,
                    name: row.get(4)?,
                    note: row.get(5)?,
                    status: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                    archived_at: row.get(9)?,
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
        })
    }

    /// 创建新项目。
    pub fn create(
        conn: &Connection,
        space_id: &str,
        name: &str,
        parent_id: Option<&str>,
        note: Option<&str>,
    ) -> Result<ProjectDto, AppError> {
        let name = name.trim();
        if name.is_empty() {
            return Err(AppError::Validation("项目名称不能为空".to_string()));
        }

        // 计算 path：如果有 parent，需要获取 parent 的 path
        let path = if let Some(pid) = parent_id {
            // 验证 parent 是否存在且属于同一个 space
            let parent: ProjectDto = conn.query_row(
                r#"
SELECT id, space_id, parent_id, path, name, note, status,
  created_at, updated_at, archived_at
FROM projects
WHERE id = ?1 AND space_id = ?2
"#,
                (pid, space_id),
                |row| {
                    Ok(ProjectDto {
                        id: row.get(0)?,
                        space_id: row.get(1)?,
                        parent_id: row.get(2)?,
                        path: row.get(3)?,
                        name: row.get(4)?,
                        note: row.get(5)?,
                        status: row.get(6)?,
                        created_at: row.get(7)?,
                        updated_at: row.get(8)?,
                        archived_at: row.get(9)?,
                    })
                },
            )?;
            format!("{}/{}", parent.path, name)
        } else {
            format!("/{name}")
        };

        let now = now_ms();
        let id = Uuid::new_v4().to_string();

        conn.execute(
            r#"
INSERT INTO projects(
  id, space_id, parent_id, path,
  name, note, status,
  created_at, updated_at, archived_at
) VALUES (
  ?1, ?2, ?3, ?4,
  ?5, ?6, 'active',
  ?7, ?7, NULL
)
"#,
            params![id, space_id, parent_id, path, name, note, now],
        )?;

        Ok(ProjectDto {
            id,
            space_id: space_id.to_string(),
            parent_id: parent_id.map(|s| s.to_string()),
            path,
            name: name.to_string(),
            note: note.map(|s| s.to_string()),
            status: "active".to_string(),
            created_at: now,
            updated_at: now,
            archived_at: None,
        })
    }
}
