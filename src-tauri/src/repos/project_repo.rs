use rusqlite::Connection;

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
}

