use std::{path::PathBuf, time::SystemTime};

use rusqlite::Connection;
use tauri::{path::BaseDirectory, AppHandle, Manager};

use crate::types::error::AppError;

pub mod migrations;

/// M1：最小实现，单连接 + Mutex。
///
/// 说明：`rusqlite::Connection` 不是并发安全的；通过 Mutex 保证串行访问即可。
pub struct DbState {
    pub conn: std::sync::Mutex<Connection>,
}

/// Unix 毫秒时间戳（i64）。
pub fn now_ms() -> i64 {
    let dur = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    dur.as_millis() as i64
}

fn resolve_db_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    app.path()
        .resolve("stoneflow/stoneflow.db", BaseDirectory::AppData)
        .map_err(|e| AppError::Path(e.to_string()))
}

/// 初始化数据库（创建目录、打开连接、设置 PRAGMA、跑 migrations、seed 默认 spaces）。
pub fn init_db(app: &AppHandle) -> Result<DbState, AppError> {
    let db_path = resolve_db_path(app)?;

    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut conn = Connection::open(db_path)?;

    // PRAGMA：M1 先固定做，减少“锁/一致性”类问题。
    conn.execute_batch(
        r#"
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 2000;
"#,
    )?;

    migrations::run_migrations(&mut conn)?;
    seed_default_spaces_if_empty(&mut conn)?;
    seed_default_projects_and_backfill_tasks(&mut conn)?;

    Ok(DbState {
        conn: std::sync::Mutex::new(conn),
    })
}

fn seed_default_spaces_if_empty(conn: &mut Connection) -> Result<(), AppError> {
    let count: i64 = conn.query_row("SELECT COUNT(1) FROM spaces", (), |row| row.get(0))?;
    if count > 0 {
        return Ok(());
    }

    let now = now_ms();
    let tx = conn.transaction()?;

    // 固定 id：与前端选择器一致，减少映射复杂度。
    // order：用于默认排序。
    let spaces = [
        ("work", "工作", 1_i64),
        ("study", "学习", 2_i64),
        ("personal", "个人", 3_i64),
    ];

    for (id, name, order) in spaces {
        tx.execute(
      "INSERT INTO spaces(id, name, \"order\", created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
      (id, name, order, now, now),
    )?;
    }

    tx.commit()?;
    Ok(())
}

/// 为每个已存在的 Space 确保有一个 Default Project，并将缺少 project_id 的任务挂到该默认 Project 上。
/// 每次初始化时都会检查并创建缺失的 default project（不只是首次）。
fn seed_default_projects_and_backfill_tasks(conn: &mut Connection) -> Result<(), AppError> {
    // 检查 projects 表是否存在；如果不存在说明迁移尚未生效，直接跳过。
    let has_projects_table: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM sqlite_master WHERE type = 'table' AND name = 'projects'",
            (),
            |row| row.get(0),
        )
        .unwrap_or(0);
    if has_projects_table == 0 {
        return Ok(());
    }

    let now = now_ms();
    let tx = conn.transaction()?;

    // 获取所有 space
    let mut stmt = tx.prepare("SELECT id, name FROM spaces ORDER BY \"order\" ASC")?;
    let rows = stmt.query_map((), |row| {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        Ok((id, name))
    })?;

    // 收集所有 space 数据，避免在借用 tx 的同时使用它
    let spaces: Vec<(String, String)> = rows.collect::<Result<Vec<_>, _>>()?;
    drop(stmt); // 显式释放 stmt，释放对 tx 的借用

    for (space_id, _space_name) in spaces {
        let project_id = format!("{space_id}_default");

        // 检查该 space 的 default project 是否已存在
        let exists: i64 = tx
            .query_row(
                "SELECT COUNT(1) FROM projects WHERE id = ?1",
                (&project_id,),
                |row| row.get(0),
            )
            .unwrap_or(0);

        // 如果不存在，创建 default project
        if exists == 0 {
            let project_title = "Default Project".to_string();
            let path = "/Default Project".to_string();

            tx.execute(
                r#"
INSERT INTO projects(
  id, space_id, parent_id, path,
  title, note, priority,
  todo_task_count, done_task_count, last_task_updated_at,
  created_at, updated_at, archived_at, deleted_at,
  create_by, rank
) VALUES (
  ?1, ?2, NULL, ?3,
  ?4, NULL, 'P1',
  0, 0, NULL,
  ?5, ?5, NULL, NULL,
  'stonefish', 1024
)
"#,
                (
                    project_id.clone(),
                    space_id.clone(),
                    path,
                    project_title,
                    now,
                ),
            )?;
        }

        // 将该 space 下尚未关联 project_id 的任务，全部挂到对应的 Default Project。
        tx.execute(
            r#"
UPDATE tasks
SET project_id = ?1
WHERE space_id = ?2
  AND project_id IS NULL
"#,
            (&project_id, &space_id),
        )?;

        tx.execute(
            r#"
UPDATE projects
SET todo_task_count = (
    SELECT COUNT(1) FROM tasks t
    WHERE t.project_id = ?1
      AND t.status = 'todo'
      AND t.archived_at IS NULL
      AND t.deleted_at IS NULL
  ),
  done_task_count = (
    SELECT COUNT(1) FROM tasks t
    WHERE t.project_id = ?1
      AND t.status = 'done'
      AND t.archived_at IS NULL
      AND t.deleted_at IS NULL
  ),
  last_task_updated_at = ?2
WHERE id = ?1
"#,
            (&project_id, now),
        )?;
    }

    tx.commit()?;
    Ok(())
}
