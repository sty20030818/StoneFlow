use std::collections::HashMap;

use rusqlite::{params, types::Value, Connection};
use uuid::Uuid;

use crate::db::now_ms;
use crate::types::{
    dto::{LinkDto, ProjectDto},
    error::AppError,
};

pub struct ProjectRepo;

impl ProjectRepo {
    fn compute_status(
        deleted_at: Option<i64>,
        archived_at: Option<i64>,
        todo_task_count: i64,
        done_task_count: i64,
    ) -> String {
        if deleted_at.is_some() {
            return "deleted".to_string();
        }
        if archived_at.is_some() {
            return "archived".to_string();
        }
        if todo_task_count > 0 {
            return "inProgress".to_string();
        }
        if done_task_count > 0 {
            return "done".to_string();
        }
        "inProgress".to_string()
    }

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
  p.rank,
  GROUP_CONCAT(tag.name, ',') as tags
FROM projects p
LEFT JOIN project_tags pt ON p.id = pt.project_id
LEFT JOIN tags tag ON pt.tag_id = tag.id
WHERE p.space_id = ?1
GROUP BY p.id
ORDER BY p.path ASC
"#,
        )?;

        let rows = stmt.query_map((space_id,), |row| {
            let tags_str: Option<String> = row.get(16)?;
            let tags = if let Some(s) = tags_str {
                if s.is_empty() {
                    Vec::new()
                } else {
                    s.split(',').map(|s| s.to_string()).collect()
                }
            } else {
                Vec::new()
            };

            let archived_at: Option<i64> = row.get(12)?;
            let deleted_at: Option<i64> = row.get(13)?;
            let todo_task_count: i64 = row.get(7)?;
            let done_task_count: i64 = row.get(8)?;
            let computed_status =
                Self::compute_status(deleted_at, archived_at, todo_task_count, done_task_count);
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
                tags,
                links: Vec::new(),
            })
        })?;

        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        if !out.is_empty() {
            let project_ids = out.iter().map(|p| p.id.clone()).collect::<Vec<_>>();
            let link_map = Self::load_links_for_projects(conn, &project_ids)?;
            for project in &mut out {
                project.links = link_map.get(&project.id).cloned().unwrap_or_default();
            }
        }
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
  p.create_by, p.rank,
  GROUP_CONCAT(tag.name, ',') as tags
FROM projects p
LEFT JOIN project_tags pt ON p.id = pt.project_id
LEFT JOIN tags tag ON pt.tag_id = tag.id
WHERE p.id = ?1
GROUP BY p.id
"#,
            (&default_id,),
            |row| {
                let tags_str: Option<String> = row.get(16)?;
                let tags = if let Some(s) = tags_str {
                    if s.is_empty() {
                        Vec::new()
                    } else {
                        s.split(',').map(|s| s.to_string()).collect()
                    }
                } else {
                    Vec::new()
                };

                let archived_at: Option<i64> = row.get(12)?;
                let deleted_at: Option<i64> = row.get(13)?;
                let todo_task_count: i64 = row.get(7)?;
                let done_task_count: i64 = row.get(8)?;
                let computed_status =
                    Self::compute_status(deleted_at, archived_at, todo_task_count, done_task_count);
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
                    tags,
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

        let link_map = Self::load_links_for_projects(conn, &[project.id.clone()])?;
        project.links = link_map.get(&project.id).cloned().unwrap_or_default();

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

        let priority = priority.unwrap_or("P1").trim().to_uppercase();
        if !matches!(priority.as_str(), "P0" | "P1" | "P2" | "P3") {
            return Err(AppError::Validation(
                "项目优先级不合法（应为 P0-P3）".to_string(),
            ));
        }

        // 计算 path：如果有 parent，需要获取 parent 的 path
        let path = if let Some(pid) = parent_id {
            // 验证 parent 是否存在且属于同一个 space
            let parent: ProjectDto = conn.query_row(
                r#"
SELECT id, space_id, parent_id, path, title, note, priority,
  todo_task_count, done_task_count, last_task_updated_at,
  created_at, updated_at, archived_at, deleted_at, create_by, rank
FROM projects
WHERE id = ?1 AND space_id = ?2
"#,
                (pid, space_id),
                |row| {
                    let archived_at: Option<i64> = row.get(12)?;
                    let deleted_at: Option<i64> = row.get(13)?;
                    let todo_task_count: i64 = row.get(7)?;
                    let done_task_count: i64 = row.get(8)?;
                    let computed_status = Self::compute_status(
                        deleted_at,
                        archived_at,
                        todo_task_count,
                        done_task_count,
                    );
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
            )?;
            format!("{}/{}", parent.path, title)
        } else {
            format!("/{title}")
        };

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

        let computed_status = Self::compute_status(None, None, 0, 0);

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

    fn load_links_for_projects(
        conn: &Connection,
        project_ids: &[String],
    ) -> Result<HashMap<String, Vec<LinkDto>>, AppError> {
        if project_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let mut placeholders = String::new();
        let mut params: Vec<Value> = Vec::with_capacity(project_ids.len());
        for (idx, id) in project_ids.iter().enumerate() {
            if idx > 0 {
                placeholders.push_str(", ");
            }
            placeholders.push('?');
            params.push(Value::Text(id.to_string()));
        }

        let sql = format!(
            r#"
SELECT
  pl.project_id, l.id, l.title, l.url, l.kind, l.rank, l.created_at, l.updated_at
FROM project_links pl
INNER JOIN links l ON l.id = pl.link_id
WHERE pl.project_id IN ({})
ORDER BY l.rank ASC, l.created_at ASC
"#,
            placeholders
        );

        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(params), |row| {
            Ok((
                row.get::<_, String>(0)?,
                LinkDto {
                    id: row.get(1)?,
                    title: row.get(2)?,
                    url: row.get(3)?,
                    kind: row.get(4)?,
                    rank: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                },
            ))
        })?;

        let mut map: HashMap<String, Vec<LinkDto>> = HashMap::new();
        for row in rows {
            let (project_id, link) = row?;
            map.entry(project_id).or_default().push(link);
        }

        Ok(map)
    }
}
