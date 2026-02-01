use std::collections::{HashMap, HashSet};

use rusqlite::{params, types::Value, Connection};
use uuid::Uuid;

use crate::types::error::AppError;

pub enum TagEntity {
    Task,
    #[allow(dead_code)]
    Project,
}

impl TagEntity {
    fn table(&self) -> &'static str {
        match self {
            TagEntity::Task => "task_tags",
            TagEntity::Project => "project_tags",
        }
    }

    fn owner_column(&self) -> &'static str {
        match self {
            TagEntity::Task => "task_id",
            TagEntity::Project => "project_id",
        }
    }
}

pub fn load_tags(
    conn: &Connection,
    entity: TagEntity,
    owner_ids: &[String],
) -> Result<HashMap<String, Vec<String>>, AppError> {
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

    let table = entity.table();
    let owner_column = entity.owner_column();
    let sql = format!(
        r#"
SELECT
  tt.{owner_column}, tag.name
FROM {table} tt
INNER JOIN tags tag ON tt.tag_id = tag.id
WHERE tt.{owner_column} IN ({placeholders})
ORDER BY tag.name ASC, tag.created_at ASC
"#,
        owner_column = owner_column,
        table = table,
        placeholders = placeholders
    );

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params), |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    let mut map: HashMap<String, Vec<String>> = HashMap::new();
    for row in rows {
        let (owner_id, name) = row?;
        map.entry(owner_id).or_default().push(name);
    }

    Ok(map)
}

pub fn sync_tags(
    conn: &Connection,
    entity: TagEntity,
    owner_id: &str,
    tags: &[String],
    created_at: i64,
) -> Result<(), AppError> {
    let normalized = normalize_tag_names(tags);

    let delete_sql = format!(
        "DELETE FROM {table} WHERE {owner_column} = ?1",
        table = entity.table(),
        owner_column = entity.owner_column()
    );
    conn.execute(&delete_sql, params![owner_id])?;

    for name in normalized {
        let tag_id = ensure_tag(conn, &name, created_at)?;
        let insert_sql = format!(
            "INSERT OR IGNORE INTO {table}({owner_column}, tag_id) VALUES (?1, ?2)",
            table = entity.table(),
            owner_column = entity.owner_column()
        );
        conn.execute(&insert_sql, params![owner_id, tag_id])?;
    }

    Ok(())
}

fn normalize_tag_names(tags: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    tags.iter()
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .filter(|t| seen.insert(t.clone()))
        .collect()
}

fn ensure_tag(conn: &Connection, name: &str, created_at: i64) -> Result<String, AppError> {
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
                "INSERT INTO tags(id, name, created_at) VALUES (?1, ?2, ?3)",
                params![id, name, created_at],
            )?;
            Ok(id)
        }
        Err(err) => Err(err.into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().expect("open in memory");
        conn.execute_batch(
            r#"
CREATE TABLE tags(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE task_tags(task_id TEXT NOT NULL, tag_id TEXT NOT NULL);
CREATE TABLE project_tags(project_id TEXT NOT NULL, tag_id TEXT NOT NULL);
"#,
        )
        .expect("create tables");
        conn
    }

    #[test]
    fn sync_and_load_tags_for_task() {
        let conn = setup_conn();
        let tags = vec![" foo ".to_string(), "bar".to_string(), "foo".to_string()];
        sync_tags(&conn, TagEntity::Task, "task-1", &tags, 1).expect("sync tags");

        let map = load_tags(&conn, TagEntity::Task, &["task-1".to_string()]).expect("load tags");
        let items = map.get("task-1").expect("task tags");
        assert_eq!(items.len(), 2);
        assert_eq!(items[0], "bar");
        assert_eq!(items[1], "foo");
    }
}
