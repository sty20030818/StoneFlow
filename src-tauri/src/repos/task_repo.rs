use std::collections::{BTreeMap, HashMap, HashSet};

use rusqlite::{params, types::Value, Connection};
use uuid::Uuid;

use crate::db::now_ms;
use crate::types::{
    dto::{CustomFieldItemDto, CustomFieldsDto, LinkDto, LinkInputDto, TaskDto},
    error::AppError,
};

pub struct TaskRepo;

struct NormalizedLinkInput {
    id: Option<String>,
    title: String,
    url: String,
    kind: String,
    rank: i64,
}

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
  t.id, t.space_id, t.project_id, t.title, t.note, t.status, t.done_reason, t.priority,
  t.rank, t.created_at, t.updated_at, t.completed_at, t.deadline_at, t.archived_at,
  t.deleted_at, t.custom_fields, t.create_by,
  GROUP_CONCAT(tag.name, ',') as tags
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

        sql.push_str(" GROUP BY t.id ORDER BY t.rank DESC, t.created_at DESC\n");

        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(ps), |row| {
            let tags_str: Option<String> = row.get(17)?;
            let tags = if let Some(s) = tags_str {
                if s.is_empty() {
                    Vec::new()
                } else {
                    s.split(',').map(|s| s.to_string()).collect()
                }
            } else {
                Vec::new()
            };

            let custom_fields = Self::parse_custom_fields(row.get(15)?);

            Ok(TaskDto {
                id: row.get(0)?,
                space_id: row.get(1)?,
                project_id: row.get(2)?,
                title: row.get(3)?,
                note: row.get(4)?,
                status: row.get(5)?,
                done_reason: row.get(6)?,
                priority: row.get(7)?,
                tags,
                rank: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                completed_at: row.get(11)?,
                deadline_at: row.get(12)?,
                archived_at: row.get(13)?,
                deleted_at: row.get(14)?,
                links: Vec::new(),
                custom_fields,
                create_by: row.get(16)?,
            })
        })?;

        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }

        if !out.is_empty() {
            let task_ids = out.iter().map(|t| t.id.clone()).collect::<Vec<_>>();
            let link_map = Self::load_links_for_tasks(conn, &task_ids)?;
            for task in &mut out {
                task.links = link_map.get(&task.id).cloned().unwrap_or_default();
            }
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
        let _auto_start = auto_start;
        let status = "todo";
        let rank = 1024;
        let updated_at = now;
        let create_by = "stonefish";

        conn.execute(
            r#"
INSERT INTO tasks(
  id, space_id, project_id, title, note, status, done_reason, priority,
  rank, created_at, updated_at, completed_at, deadline_at, archived_at, deleted_at,
  custom_fields, create_by
) VALUES (
  ?1, ?2, ?3, ?4, NULL, ?5, NULL, 'P1',
  ?6, ?7, ?8, NULL, NULL, NULL, NULL,
  NULL, ?9
)
"#,
            params![id, space_id, project_id, title, status, rank, now, updated_at, create_by],
        )?;

        if let Some(project_id) = project_id {
            Self::refresh_project_stats(conn, project_id, now)?;
        }

        Ok(TaskDto {
            id,
            space_id: space_id.to_string(),
            project_id: project_id.map(|s| s.to_string()),
            title: title.to_string(),
            note: None,
            status: status.to_string(),
            done_reason: None,
            priority: "P1".to_string(),
            tags: Vec::new(),
            rank,
            created_at: now,
            updated_at,
            completed_at: None,
            deadline_at: None,
            archived_at: None,
            deleted_at: None,
            links: Vec::new(),
            custom_fields: None,
            create_by: create_by.to_string(),
        })
    }

    pub fn complete(conn: &Connection, id: &str) -> Result<(), AppError> {
        let now = now_ms();
        let project_id: Option<String> = conn
            .query_row(
                "SELECT project_id FROM tasks WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .unwrap_or(None);
        let changed = conn.execute(
            "UPDATE tasks SET status = 'done', done_reason = 'completed', completed_at = ?1, updated_at = ?2 WHERE id = ?3",
            params![now, now, id],
        )?;
        if changed == 0 {
            return Err(AppError::Validation("任务不存在".to_string()));
        }
        if let Some(project_id) = project_id.as_deref() {
            Self::refresh_project_stats(conn, project_id, now)?;
        }
        Ok(())
    }

    pub fn delete_many(conn: &mut Connection, ids: &[String]) -> Result<usize, AppError> {
        if ids.is_empty() {
            return Err(AppError::Validation("请选择要删除的任务".to_string()));
        }

        let tx = conn.transaction()?;
        let now = now_ms();

        let mut placeholders = String::new();
        let mut params: Vec<Value> = Vec::with_capacity(ids.len());
        for (idx, id) in ids.iter().enumerate() {
            if idx > 0 {
                placeholders.push_str(", ");
            }
            placeholders.push('?');
            params.push(Value::Text(id.to_string()));
        }

        let project_query = format!(
            "SELECT DISTINCT project_id FROM tasks WHERE id IN ({}) AND project_id IS NOT NULL",
            placeholders
        );
        let project_ids = {
            let mut project_stmt = tx.prepare(&project_query)?;
            let project_rows =
                project_stmt.query_map(rusqlite::params_from_iter(params.clone()), |row| {
                    row.get::<_, String>(0)
                })?;
            let mut project_ids = Vec::new();
            for row in project_rows {
                project_ids.push(row?);
            }
            project_ids
        };

        let sql = format!("DELETE FROM tasks WHERE id IN ({})", placeholders);
        let changed = tx.execute(&sql, rusqlite::params_from_iter(params))?;

        for project_id in project_ids {
            Self::refresh_project_stats(&tx, &project_id, now)?;
        }

        tx.commit()?;
        Ok(changed)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn update(
        conn: &mut Connection,
        id: &str,
        title: Option<&str>,
        status: Option<&str>,
        done_reason: Option<Option<&str>>,
        priority: Option<&str>,
        note: Option<Option<&str>>,
        tags: Option<Vec<String>>,
        space_id: Option<&str>,
        project_id: Option<Option<&str>>,
        deadline_at: Option<Option<i64>>,
        rank: Option<i64>,
        links: Option<Vec<LinkInputDto>>,
        custom_fields: Option<Option<CustomFieldsDto>>,
        archived_at: Option<Option<i64>>,
        deleted_at: Option<Option<i64>>,
    ) -> Result<(), AppError> {
        let tx = conn.transaction()?;

        if !Self::task_exists(&tx, id)? {
            return Err(AppError::Validation("任务不存在".to_string()));
        }

        let now = now_ms();
        let previous_project_id = tx.query_row(
            "SELECT project_id FROM tasks WHERE id = ?1",
            params![id],
            |row| row.get::<_, Option<String>>(0),
        )?;
        let mut sets: Vec<&str> = Vec::new();
        let mut ps: Vec<Value> = Vec::new();
        let mut changed_any = false;
        let mut touch_updated_at = false;
        let mut updated_at_written = false;

        if let Some(title) = title {
            let title = title.trim();
            if title.is_empty() {
                return Err(AppError::Validation("任务标题不能为空".to_string()));
            }
            sets.push("title = ?");
            ps.push(Value::Text(title.to_string()));
            touch_updated_at = true;
        }

        if let Some(status) = status {
            let status = status.trim().to_lowercase();
            if status != "todo" && status != "done" {
                return Err(AppError::Validation("状态必须为 todo 或 done".to_string()));
            }
            sets.push("status = ?");
            ps.push(Value::Text(status.clone()));
            touch_updated_at = true;

            if status == "done" {
                let reason = done_reason
                    .ok_or_else(|| {
                        AppError::Validation("完成任务时必须提供 doneReason".to_string())
                    })?
                    .ok_or_else(|| {
                        AppError::Validation("完成任务时必须提供 doneReason".to_string())
                    })?;
                let reason = reason.trim().to_lowercase();
                if reason != "completed" && reason != "cancelled" {
                    return Err(AppError::Validation(
                        "doneReason 必须为 completed 或 cancelled".to_string(),
                    ));
                }
                sets.push("done_reason = ?");
                ps.push(Value::Text(reason));
                sets.push("completed_at = ?");
                ps.push(Value::Integer(now));
            } else {
                sets.push("done_reason = NULL");
                sets.push("completed_at = NULL");
            }
        } else if let Some(done_reason) = done_reason {
            let current_status: String = tx.query_row(
                "SELECT status FROM tasks WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )?;
            if current_status != "done" {
                return Err(AppError::Validation(
                    "仅完成任务可设置 doneReason".to_string(),
                ));
            }
            let reason = done_reason
                .ok_or_else(|| AppError::Validation("doneReason 不可为空".to_string()))?;
            let reason = reason.trim().to_lowercase();
            if reason != "completed" && reason != "cancelled" {
                return Err(AppError::Validation(
                    "doneReason 必须为 completed 或 cancelled".to_string(),
                ));
            }
            sets.push("done_reason = ?");
            ps.push(Value::Text(reason));
            touch_updated_at = true;
        }

        if let Some(priority) = priority {
            if !["P0", "P1", "P2", "P3"].contains(&priority) {
                return Err(AppError::Validation(
                    "优先级必须是 P0, P1, P2 或 P3".to_string(),
                ));
            }
            sets.push("priority = ?");
            ps.push(Value::Text(priority.to_string()));
            touch_updated_at = true;
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
            touch_updated_at = true;
        }

        if let Some(space_id) = space_id {
            sets.push("space_id = ?");
            ps.push(Value::Text(space_id.to_string()));
            touch_updated_at = true;
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
            touch_updated_at = true;
        }

        if let Some(deadline_at) = deadline_at {
            match deadline_at {
                Some(value) => {
                    sets.push("deadline_at = ?");
                    ps.push(Value::Integer(value));
                }
                None => {
                    sets.push("deadline_at = NULL");
                }
            }
            touch_updated_at = true;
        }

        if let Some(rank) = rank {
            sets.push("rank = ?");
            ps.push(Value::Integer(rank));
            touch_updated_at = true;
        }

        if let Some(links) = links {
            Self::sync_links(&tx, id, &links)?;
            touch_updated_at = true;
            changed_any = true;
        }

        if let Some(custom_fields) = custom_fields {
            match custom_fields {
                Some(value) => {
                    let normalized = Self::normalize_custom_fields(value)?;
                    let payload = Self::serialize_custom_fields(&normalized)?;
                    sets.push("custom_fields = ?");
                    ps.push(Value::Text(payload));
                }
                None => {
                    sets.push("custom_fields = NULL");
                }
            }
            touch_updated_at = true;
        }

        if let Some(archived_at) = archived_at {
            match archived_at {
                Some(value) => {
                    sets.push("archived_at = ?");
                    ps.push(Value::Integer(value));
                }
                None => {
                    sets.push("archived_at = NULL");
                }
            }
            touch_updated_at = true;
        }

        if let Some(deleted_at) = deleted_at {
            match deleted_at {
                Some(value) => {
                    sets.push("deleted_at = ?");
                    ps.push(Value::Integer(value));
                }
                None => {
                    sets.push("deleted_at = NULL");
                }
            }
            touch_updated_at = true;
        }

        if touch_updated_at && !sets.is_empty() {
            sets.push("updated_at = ?");
            ps.push(Value::Integer(now));
            updated_at_written = true;
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
            touch_updated_at = true;
            Self::sync_tags(&tx, id, &tags)?;
            changed_any = true;
        }

        if touch_updated_at && !updated_at_written {
            tx.execute(
                "UPDATE tasks SET updated_at = ?1 WHERE id = ?2",
                params![now, id],
            )?;
        }

        if !changed_any {
            return Err(AppError::Validation("没有可更新的字段".to_string()));
        }

        let current_project_id = tx.query_row(
            "SELECT project_id FROM tasks WHERE id = ?1",
            params![id],
            |row| row.get::<_, Option<String>>(0),
        )?;

        let mut touched_project_ids = HashSet::new();
        if let Some(value) = previous_project_id {
            touched_project_ids.insert(value);
        }
        if let Some(value) = current_project_id {
            touched_project_ids.insert(value);
        }
        for project_id in touched_project_ids {
            Self::refresh_project_stats(&tx, &project_id, now)?;
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
            let tag_id = Self::ensure_tag(conn, &name, now)?;
            conn.execute(
                "INSERT OR IGNORE INTO task_tags(task_id, tag_id) VALUES (?1, ?2)",
                params![task_id, tag_id],
            )?;
        }

        Ok(())
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

    fn load_links_for_tasks(
        conn: &Connection,
        task_ids: &[String],
    ) -> Result<HashMap<String, Vec<LinkDto>>, AppError> {
        if task_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let mut placeholders = String::new();
        let mut params: Vec<Value> = Vec::with_capacity(task_ids.len());
        for (idx, id) in task_ids.iter().enumerate() {
            if idx > 0 {
                placeholders.push_str(", ");
            }
            placeholders.push('?');
            params.push(Value::Text(id.to_string()));
        }

        let sql = format!(
            r#"
SELECT
  tl.task_id, l.id, l.title, l.url, l.kind, l.rank, l.created_at, l.updated_at
FROM task_links tl
INNER JOIN links l ON l.id = tl.link_id
WHERE tl.task_id IN ({})
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
            let (task_id, link) = row?;
            map.entry(task_id).or_default().push(link);
        }

        Ok(map)
    }

    fn sync_links(conn: &Connection, task_id: &str, links: &[LinkInputDto]) -> Result<(), AppError> {
        let now = now_ms();

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

        conn.execute("DELETE FROM task_links WHERE task_id = ?1", params![task_id])?;

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

            conn.execute(
                "INSERT OR IGNORE INTO task_links(task_id, link_id) VALUES (?1, ?2)",
                params![task_id, link_id],
            )?;
        }

        Ok(())
    }

    fn refresh_project_stats(
        conn: &Connection,
        project_id: &str,
        now: i64,
    ) -> Result<(), AppError> {
        let todo_task_count: i64 = conn.query_row(
            r#"
SELECT COUNT(1)
FROM tasks
WHERE project_id = ?1
  AND status = 'todo'
  AND archived_at IS NULL
  AND deleted_at IS NULL
"#,
            params![project_id],
            |row| row.get(0),
        )?;
        let done_task_count: i64 = conn.query_row(
            r#"
SELECT COUNT(1)
FROM tasks
WHERE project_id = ?1
  AND status = 'done'
  AND archived_at IS NULL
  AND deleted_at IS NULL
"#,
            params![project_id],
            |row| row.get(0),
        )?;

        conn.execute(
            "UPDATE projects SET todo_task_count = ?1, done_task_count = ?2, last_task_updated_at = ?3 WHERE id = ?4",
            params![todo_task_count, done_task_count, now, project_id],
        )?;

        Ok(())
    }

    fn parse_custom_fields(raw: Option<String>) -> Option<CustomFieldsDto> {
        raw.and_then(|value| serde_json::from_str::<CustomFieldsDto>(&value).ok())
    }

    fn serialize_custom_fields(fields: &CustomFieldsDto) -> Result<String, AppError> {
        serde_json::to_string(fields)
            .map_err(|e| AppError::Validation(format!("customFields 序列化失败: {e}")))
    }

    fn normalize_custom_fields(input: CustomFieldsDto) -> Result<CustomFieldsDto, AppError> {
        let mut map: BTreeMap<String, CustomFieldItemDto> = BTreeMap::new();

        for item in input.fields {
            let key = item.key.trim().to_string();
            if key.is_empty() {
                return Err(AppError::Validation(
                    "customFields.key 不能为空".to_string(),
                ));
            }
            let label = item.label.trim().to_string();
            if label.is_empty() {
                return Err(AppError::Validation(
                    "customFields.label 不能为空".to_string(),
                ));
            }
            let value = item.value.map(|v| v.trim().to_string());
            map.insert(key.clone(), CustomFieldItemDto { key, label, value });
        }

        Ok(CustomFieldsDto {
            fields: map.into_values().collect(),
        })
    }
}
