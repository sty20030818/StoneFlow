//! 远端数据库连接支撑。
//!
//! 这个文件只处理两件事：
//! - 建立远端连接
//! - 在连接成功后确保远端 schema 已迁移完成
//!
//! 它不关心 pull / push，也不关心具体同步哪张表。

use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use sea_orm_migration::MigratorTrait;

use crate::db::migrator::Migrator;

use super::error::SyncError;

/// 建立远端数据库短连接，并在连接后确保 schema 已迁移完成。
pub(super) async fn get_remote_db(database_url: &str) -> Result<DatabaseConnection, SyncError> {
    // 先做最便宜的输入校验，避免把空串带进数据库驱动层。
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

    // 连接成功后立即迁移，保证后续同步看到的是最新 schema。
    Migrator::up(&db, None)
        .await
        .map_err(SyncError::migration)?;

    Ok(db)
}

/// 连接测试复用正式连接逻辑，保证“测试通过”与“真实同步可用”是同一套标准。
pub(super) async fn test_connection(database_url: &str) -> Result<(), SyncError> {
    let _ = get_remote_db(database_url).await?;
    Ok(())
}
