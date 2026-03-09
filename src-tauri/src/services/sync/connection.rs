use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use sea_orm_migration::MigratorTrait;

use crate::db::migrator::Migrator;

use super::error::SyncError;

/// 建立远端数据库短连接，并在连接后确保 schema 已迁移完成。
pub(super) async fn get_remote_db(database_url: &str) -> Result<DatabaseConnection, SyncError> {
    let database_url = database_url.trim();
    if database_url.is_empty() {
        return Err(SyncError::validation("数据库地址为空"));
    }

    let mut opt = ConnectOptions::new(database_url.to_string());
    // 远端同步属于命令式短连接场景，连接池要尽量保守，避免把 Neon 打满。
    opt.max_connections(4)
        .min_connections(0)
        .connect_timeout(std::time::Duration::from_secs(12))
        .acquire_timeout(std::time::Duration::from_secs(20))
        .idle_timeout(std::time::Duration::from_secs(30));

    let db = Database::connect(opt)
        .await
        .map_err(SyncError::connection)?;

    Migrator::up(&db, None)
        .await
        .map_err(SyncError::migration)?;

    Ok(db)
}

pub(super) async fn test_connection(database_url: &str) -> Result<(), SyncError> {
    let _ = get_remote_db(database_url).await?;
    Ok(())
}
