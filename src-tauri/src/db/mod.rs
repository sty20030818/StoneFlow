use std::time::SystemTime;

use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use sea_orm_migration::MigratorTrait;
use tauri::AppHandle;

use crate::types::error::AppError;

pub mod entities;
pub mod migrator;
pub mod path;
pub mod seed;

pub struct DbState {
    pub conn: DatabaseConnection,
}

/// Unix 毫秒时间戳（i64）。
pub fn now_ms() -> i64 {
    let dur = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    dur.as_millis() as i64
}

/// 初始化数据库（创建目录、打开连接、设置 PRAGMA、跑 migrations）。
pub async fn init_db(app: &AppHandle) -> Result<DbState, AppError> {
    let db_path = path::resolve_db_path(app)?;
    let db_url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy());

    let mut opt = ConnectOptions::new(db_url);
    opt.max_connections(100)
        .min_connections(5)
        .connect_timeout(std::time::Duration::from_secs(8))
        .idle_timeout(std::time::Duration::from_secs(8))
        .sqlx_logging(true);

    let conn = Database::connect(opt)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to connect to database: {}", e)))?;

    // 运行数据库迁移
    migrator::Migrator::up(&conn, None)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to run migrations: {}", e)))?;

    // 填充初始数据
    seed::spaces::seed_default_spaces_if_empty(&conn).await?;
    seed::projects::seed_default_projects_and_backfill_tasks(&conn).await?;

    Ok(DbState { conn })
}
