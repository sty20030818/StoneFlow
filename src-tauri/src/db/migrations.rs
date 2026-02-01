use rusqlite::Connection;

use crate::types::error::AppError;

struct Migration {
    version: i64,
    sql: &'static str,
}

const INIT_MIGRATION: Migration = Migration {
    version: 1,
    sql: include_str!("migrations/0001_init.sql"),
};

const INIT_VERSION: i64 = INIT_MIGRATION.version;
const INIT_SQL: &str = INIT_MIGRATION.sql;

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

    if current == INIT_VERSION {
        return Ok(());
    }

    if current > 0 && current != INIT_VERSION {
        return Err(AppError::Validation(
            "检测到旧版本数据库，请删除本地数据库后重建".to_string(),
        ));
    }

    let tx = conn.transaction()?;
    tx.execute_batch(INIT_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version) VALUES (?1)",
        (INIT_VERSION,),
    )?;
    tx.commit()?;

    Ok(())
}
