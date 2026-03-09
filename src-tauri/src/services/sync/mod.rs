//! 远程同步写用例服务（本地 SQLite <-> Neon/Postgres）。
//!
//! 当前结构将同步拆成三层：
//! - `pull` / `push` 负责顶层流程编排
//! - `connection` / `watermarks` / `report` 提供通用支撑
//! - `upsert/*` 负责各表或表组的实际同步写入
//!
//! 阅读建议：
//! - 先看本文件，理解公开入口有哪些
//! - 再看 `pull.rs` / `push.rs`，理解同步阶段顺序
//! - 最后看 `upsert/*`，理解每张表为什么用增量或去重策略

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
    /// 从远端拉取增量数据到本地。
    ///
    /// 这里只保留“服务入口”语义，不展开具体流程；
    /// 真正的阶段编排在 `pull.rs` 中，便于按职责阅读。
    pub async fn pull(
        local_db: &DatabaseConnection,
        database_url: &str,
    ) -> Result<SyncCommandReport, SyncError> {
        pull::pull(local_db, database_url).await
    }

    /// 将本地增量数据推送到远端。
    pub async fn push(
        local_db: &DatabaseConnection,
        database_url: &str,
    ) -> Result<SyncCommandReport, SyncError> {
        push::push(local_db, database_url).await
    }

    /// 只做连接和迁移预检，不执行真实同步。
    pub async fn test_connection(database_url: &str) -> Result<(), SyncError> {
        connection::test_connection(database_url).await
    }
}
