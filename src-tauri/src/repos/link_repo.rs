use std::collections::HashMap;

use rusqlite::{params, types::Value, Connection};
use uuid::Uuid;

use crate::db::now_ms;
use crate::types::{
    dto::{LinkDto, LinkInputDto},
    error::AppError,
};

pub enum LinkEntity {
    Task,
    Project,
}

impl LinkEntity {
    fn junction_table(&self) -> &'static str {
        match self {
            LinkEntity::Task => "task_links",
            LinkEntity::Project => "project_links",
        }
    }

    fn owner_column(&self) -> &'static str {
        match self {
            LinkEntity::Task => "task_id",
            LinkEntity::Project => "project_id",
        }
    }
}

struct NormalizedLinkInput {
    id: Option<String>,
    title: String,
    url: String,
    kind: String,
    rank: i64,
}

pub fn load_links(
    conn: &Connection,
    entity: LinkEntity,
    owner_ids: &[String],
) -> Result<HashMap<String, Vec<LinkDto>>, AppError> {
    if owner_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let mut placeholders = String::new();
    let mut params: Vec<Value> = Vec::with_capacity(owner_ids.len());
    for (idx, id) in owner_ids.iter().enumerate() {
        if idx > 0 {
            placeholders.push_str(", ");
        }
        placeholders.push('?');
        params.push(Value::Text(id.to_string()));
    }

    let table = entity.junction_table();
    let owner_column = entity.owner_column();
    let sql = format!(
        r#"
SELECT
  pl.{owner_column}, l.id, l.title, l.url, l.kind, l.rank, l.created_at, l.updated_at
FROM {table} pl
INNER JOIN links l ON l.id = pl.link_id
WHERE pl.{owner_column} IN ({placeholders})
ORDER BY l.rank ASC, l.created_at ASC
"#,
        owner_column = owner_column,
        table = table,
        placeholders = placeholders
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
        let (owner_id, link) = row?;
        map.entry(owner_id).or_default().push(link);
    }

    Ok(map)
}

pub fn sync_links(
    conn: &Connection,
    entity: LinkEntity,
    owner_id: &str,
    links: &[LinkInputDto],
) -> Result<(), AppError> {
    let now = now_ms();
    let normalized = normalize_link_inputs(links)?;

    let table = entity.junction_table();
    let owner_column = entity.owner_column();
    let delete_sql = format!(
        "DELETE FROM {table} WHERE {owner_column} = ?1",
        table = table,
        owner_column = owner_column
    );
    conn.execute(&delete_sql, params![owner_id])?;

    for link in normalized {
        let link_id = if let Some(id) = link.id.as_deref() {
            let existing: Result<String, rusqlite::Error> = conn.query_row(
                "SELECT id FROM links WHERE id = ?1 LIMIT 1",
                params![id],
                |row| row.get(0),
            );
            match existing {
                Ok(existing_id) => {
                    conn.execute(
                        "UPDATE links SET title = ?1, url = ?2, kind = ?3, rank = ?4, updated_at = ?5 WHERE id = ?6",
                        params![link.title, link.url, link.kind, link.rank, now, existing_id],
                    )?;
                    existing_id
                }
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    conn.execute(
                        "INSERT INTO links(id, title, url, kind, rank, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
                        params![id, link.title, link.url, link.kind, link.rank, now],
                    )?;
                    id.to_string()
                }
                Err(err) => return Err(err.into()),
            }
        } else {
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO links(id, title, url, kind, rank, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
                params![id, link.title, link.url, link.kind, link.rank, now],
            )?;
            id
        };

        let insert_sql = format!(
            "INSERT OR IGNORE INTO {table}({owner_column}, link_id) VALUES (?1, ?2)",
            table = table,
            owner_column = owner_column
        );
        conn.execute(&insert_sql, params![owner_id, link_id])?;
    }

    Ok(())
}

fn normalize_link_inputs(links: &[LinkInputDto]) -> Result<Vec<NormalizedLinkInput>, AppError> {
    let mut normalized = Vec::new();

    for link in links {
        let title = link.title.trim();
        let url = link.url.trim();
        if url.is_empty() {
            return Err(AppError::Validation("links.url 不能为空".to_string()));
        }
        let kind = link.kind.trim();
        if !matches!(
            kind,
            "doc" | "repoLocal" | "repoRemote" | "web" | "design" | "other"
        ) {
            return Err(AppError::Validation("links.kind 不合法".to_string()));
        }
        let resolved_title = if title.is_empty() { url } else { title };
        let rank = link.rank.unwrap_or(1024);
        normalized.push(NormalizedLinkInput {
            id: link.id.clone(),
            title: resolved_title.to_string(),
            url: url.to_string(),
            kind: kind.to_string(),
            rank,
        });
    }

    Ok(normalized)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().expect("open in memory");
        conn.execute_batch(
            r#"
CREATE TABLE links(
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  kind TEXT NOT NULL,
  rank INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE task_links(task_id TEXT NOT NULL, link_id TEXT NOT NULL);
CREATE TABLE project_links(project_id TEXT NOT NULL, link_id TEXT NOT NULL);
"#,
        )
        .expect("create tables");
        conn
    }

    #[test]
    fn sync_and_load_links_for_task() {
        let conn = setup_conn();
        let inputs = vec![
            LinkInputDto {
                id: None,
                title: "Doc".to_string(),
                url: "https://example.com/doc".to_string(),
                kind: "doc".to_string(),
                rank: Some(2),
            },
            LinkInputDto {
                id: None,
                title: "".to_string(),
                url: "https://example.com/web".to_string(),
                kind: "web".to_string(),
                rank: Some(1),
            },
        ];

        sync_links(&conn, LinkEntity::Task, "task-1", &inputs).expect("sync links");
        let map = load_links(&conn, LinkEntity::Task, &["task-1".to_string()]).expect("load links");
        let items = map.get("task-1").expect("task links");
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].rank, 1);
        assert_eq!(items[0].title, "https://example.com/web");
        assert_eq!(items[1].rank, 2);
    }
}
