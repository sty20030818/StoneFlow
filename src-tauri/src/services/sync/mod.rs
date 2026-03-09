//! 远程同步写用例服务（本地 SQLite <-> Neon/Postgres）。
//!
//! 当前结构将同步拆成三层：
//! - `pull` / `push` 负责顶层流程编排
//! - `connection` / `watermarks` / `report` 提供通用支撑
//! - `upsert/*` 负责各表或表组的实际同步写入

mod connection;
mod dto;
mod error;
mod helpers;
mod pull;
mod push;
mod report;
mod upsert;
mod watermarks;

use sea_orm::DatabaseConnection;

pub use dto::{DatabaseUrlArgs, SyncCommandReport};
use error::SyncError;

pub struct SyncService;

impl SyncService {
    pub async fn pull(
        local_db: &DatabaseConnection,
        database_url: &str,
    ) -> Result<SyncCommandReport, SyncError> {
        pull::pull(local_db, database_url).await
    }

    pub async fn push(
        local_db: &DatabaseConnection,
        database_url: &str,
    ) -> Result<SyncCommandReport, SyncError> {
        push::push(local_db, database_url).await
    }

    pub async fn test_connection(database_url: &str) -> Result<(), SyncError> {
        connection::test_connection(database_url).await
    }
}
