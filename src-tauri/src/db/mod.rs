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
  app
    .path()
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
  let spaces = [("work", "工作", 1_i64), ("study", "学习", 2_i64), ("personal", "个人", 3_i64)];

  for (id, name, order) in spaces {
    tx.execute(
      "INSERT INTO spaces(id, name, \"order\", created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
      (id, name, order, now, now),
    )?;
  }

  tx.commit()?;
  Ok(())
}


