//! 分表同步入口。
//!
//! 这里不写具体表逻辑，只负责：
//! - 约定同步方向 `Pull / Push`
//! - 定义不同类型表的统计结构
//! - 给 `pull.rs / push.rs` 暴露统一调用入口

mod append_only;
mod links;
mod projects;
mod relations;
mod spaces;
mod tasks;

use sea_orm::DatabaseConnection;

use super::error::SyncError;
use super::report::{DedupStats, UpsertStats};

#[derive(Debug, Clone, Copy)]
pub(super) enum SyncDirection {
    Pull,
    Push,
}

impl SyncDirection {
    /// 返回稳定方向标识，便于错误对象和调试信息复用。
    pub(super) fn as_str(self) -> &'static str {
        match self {
            Self::Pull => "pull",
            Self::Push => "push",
        }
    }
}

#[derive(Debug, Default, Clone, Copy)]
pub(super) struct AppendOnlySyncStats {
    pub tags: DedupStats,
    pub task_activity_logs: DedupStats,
}

/// 关系表统计：这些表没有 `updated_at`，所以都走去重插入路径。
#[derive(Debug, Default, Clone, Copy)]
pub(super) struct RelationSyncStats {
    pub task_tags: DedupStats,
    pub task_links: DedupStats,
    pub project_tags: DedupStats,
    pub project_links: DedupStats,
}

/// 对外暴露按表同步函数，避免上层直接依赖具体文件路径。
pub(super) async fn sync_spaces(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<UpsertStats, SyncError> {
    spaces::sync(
        source_db,
        target_db,
        since_ms,
        conflict_guard_enabled,
        direction,
    )
    .await
}

/// `projects` 与 `spaces` 一样走“增量读取 + 冲突保护 + upsert”。
pub(super) async fn sync_projects(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<UpsertStats, SyncError> {
    projects::sync(
        source_db,
        target_db,
        since_ms,
        conflict_guard_enabled,
        direction,
    )
    .await
}

/// 同步链接主表。
pub(super) async fn sync_links(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<UpsertStats, SyncError> {
    links::sync(
        source_db,
        target_db,
        since_ms,
        conflict_guard_enabled,
        direction,
    )
    .await
}

/// 同步任务主表。
pub(super) async fn sync_tasks(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<UpsertStats, SyncError> {
    tasks::sync(
        source_db,
        target_db,
        since_ms,
        conflict_guard_enabled,
        direction,
    )
    .await
}

/// append-only 表通常只看“新增了多少”，不统计 updated。
pub(super) async fn sync_append_only(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    direction: SyncDirection,
) -> Result<AppendOnlySyncStats, SyncError> {
    append_only::sync(source_db, target_db, since_ms, direction).await
}

/// 关系表集中放在一起，便于统一解释“全量去重”策略。
pub(super) async fn sync_relations(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<RelationSyncStats, SyncError> {
    relations::sync(source_db, target_db, direction).await
}
