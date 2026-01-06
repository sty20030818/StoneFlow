use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::db::now_ms;
use crate::types::{dto::ProjectDto, error::AppError};

pub struct ProjectRepo;

impl ProjectRepo {
  pub fn list(conn: &Connection, space_id: Option<&str>) -> Result<Vec<ProjectDto>, AppError> {
    let mut out = Vec::new();

    if let Some(space_id) = space_id {
      let mut stmt = conn.prepare(
        r#"
SELECT id, space_id, name, status, created_at, updated_at
FROM projects
WHERE space_id = ?1
ORDER BY created_at DESC
"#,
      )?;

      let rows = stmt.query_map([space_id], |row| {
        Ok(ProjectDto {
          id: row.get(0)?,
          space_id: row.get(1)?,
          name: row.get(2)?,
          status: row.get(3)?,
          created_at: row.get(4)?,
          updated_at: row.get(5)?,
        })
      })?;

      for r in rows {
        out.push(r?);
      }
      return Ok(out);
    }

    let mut stmt = conn.prepare(
      r#"
SELECT id, space_id, name, status, created_at, updated_at
FROM projects
ORDER BY created_at DESC
"#,
    )?;

    let rows = stmt.query_map((), |row| {
      Ok(ProjectDto {
        id: row.get(0)?,
        space_id: row.get(1)?,
        name: row.get(2)?,
        status: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
      })
    })?;

    for r in rows {
      out.push(r?);
    }
    Ok(out)
  }

  pub fn create(conn: &Connection, space_id: &str, name: &str) -> Result<ProjectDto, AppError> {
    let name = name.trim();
    if name.is_empty() {
      return Err(AppError::Validation("项目名称不能为空".to_string()));
    }

    let now = now_ms();
    let id = Uuid::new_v4().to_string();

    conn.execute(
      r#"
INSERT INTO projects(id, space_id, name, status, created_at, updated_at)
VALUES (?1, ?2, ?3, 'active', ?4, ?5)
"#,
      params![id, space_id, name, now, now],
    )?;

    Ok(ProjectDto {
      id,
      space_id: space_id.to_string(),
      name: name.to_string(),
      status: "active".to_string(),
      created_at: now,
      updated_at: now,
    })
  }
}


