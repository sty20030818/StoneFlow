mod append_only;
mod links;
mod projects;
mod relations;
mod spaces;
mod tasks;

use sea_orm::DatabaseConnection;

use super::report::{DedupStats, UpsertStats};

#[derive(Debug, Clone, Copy)]
pub(super) enum SyncDirection {
    Pull,
    Push,
}

impl SyncDirection {
    fn read_source_error(self, table: &str) -> String {
        match self {
            Self::Pull => format!("拉取远程 {} 失败", table),
            Self::Push => format!("读取本地 {} 失败", table),
        }
    }

    fn read_target_existing_error(self, table: &str) -> String {
        match self {
            Self::Pull => format!("读取本地 {} 既有数据失败", table),
            Self::Push => format!("读取远程 {} 既有数据失败", table),
        }
    }

    fn write_target_error(self, record: &str) -> String {
        match self {
            Self::Pull => format!("同步 {} 到本地失败", record),
            Self::Push => format!("推送 {} 到远程失败", record),
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
) -> Result<UpsertStats, String> {
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
) -> Result<UpsertStats, String> {
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
) -> Result<UpsertStats, String> {
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
) -> Result<UpsertStats, String> {
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
) -> Result<AppendOnlySyncStats, String> {
    append_only::sync(source_db, target_db, since_ms, direction).await
}

pub(super) async fn sync_relations(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<RelationSyncStats, String> {
    relations::sync(source_db, target_db, direction).await
}
