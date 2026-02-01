use std::time::SystemTime;

use rusqlite::Connection;
use tauri::AppHandle;

use crate::types::error::AppError;

pub mod migrations;
pub mod path;
pub mod seed;

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

/// 初始化数据库（创建目录、打开连接、设置 PRAGMA、跑 migrations、seed 默认 spaces）。
pub fn init_db(app: &AppHandle) -> Result<DbState, AppError> {
    let db_path = path::resolve_db_path(app)?;

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
    seed::spaces::seed_default_spaces_if_empty(&mut conn)?;
    seed::projects::seed_default_projects_and_backfill_tasks(&mut conn)?;

    Ok(DbState {
        conn: std::sync::Mutex::new(conn),
    })
}
