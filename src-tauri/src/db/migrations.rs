use rusqlite::Connection;

use crate::types::error::AppError;

struct Migration {
  version: i64,
  sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[
  Migration {
    version: 1,
    sql: include_str!("migrations/0001_init.sql"),
  },
  Migration {
    version: 2,
    sql: include_str!("migrations/0002_projects_and_activity.sql"),
  },
];

/// 执行所有未执行的迁移。
///
/// - 通过 `schema_migrations(version)` 记录已执行版本
/// - 每个迁移在一个事务内执行，成功后写入版本
pub fn run_migrations(conn: &mut Connection) -> Result<(), AppError> {
  // 兜底：确保迁移表存在
  conn.execute(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)",
    (),
  )?;

  let current: i64 = conn
    .query_row(
      "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
      (),
      |row| row.get(0),
    )
    .unwrap_or(0);

  for m in MIGRATIONS.iter().filter(|m| m.version > current) {
    let tx = conn.transaction()?;
    tx.execute_batch(m.sql)?;
    tx.execute("INSERT INTO schema_migrations(version) VALUES (?1)", (m.version,))?;
    tx.commit()?;
  }

  Ok(())
}


