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

#[derive(Debug, Default, Clone, Copy)]
pub(super) struct RelationSyncStats {
    pub task_tags: DedupStats,
    pub task_links: DedupStats,
    pub project_tags: DedupStats,
    pub project_links: DedupStats,
}

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

pub(super) async fn sync_append_only(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    direction: SyncDirection,
) -> Result<AppendOnlySyncStats, SyncError> {
    append_only::sync(source_db, target_db, since_ms, direction).await
}

pub(super) async fn sync_relations(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<RelationSyncStats, SyncError> {
    relations::sync(source_db, target_db, direction).await
}
