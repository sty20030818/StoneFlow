//! Push 编排入口。
//!
//! 它和 `pull.rs` 基本对称，但方向相反：
//! - 数据源变成本地
//! - 目标端变成远端
//! - 水位改读写 `last_pushed_at`

use sea_orm::DatabaseConnection;

use super::{
    connection,
    error::SyncError,
    helpers,
    report::SyncRunStats,
    upsert::{self, SyncDirection},
    watermarks,
};

/// 执行一次完整的 push 流程。
///
/// 它和 pull 共用统计结构，但数据方向和水位语义相反。
pub(super) async fn push(
    local_db: &DatabaseConnection,
    database_url: &str,
) -> Result<super::SyncCommandReport, SyncError> {
    let remote_db = connection::get_remote_db(database_url).await?;
    let current_sync_start = chrono::Utc::now().timestamp_millis();
    let last_pushed_at = watermarks::read_last_pushed_at(local_db, database_url).await?;
    let conflict_guard_enabled = helpers::is_conflict_guard_enabled();

    let spaces = upsert::sync_spaces(
        local_db,
        &remote_db,
        last_pushed_at,
        conflict_guard_enabled,
        SyncDirection::Push,
    )
    .await?;
    let projects = upsert::sync_projects(
        local_db,
        &remote_db,
        last_pushed_at,
        conflict_guard_enabled,
        SyncDirection::Push,
    )
    .await?;

    let mut stats = SyncRunStats {
        spaces,
        projects,
        ..Default::default()
    };

    stats.links = upsert::sync_links(
        local_db,
        &remote_db,
        last_pushed_at,
        conflict_guard_enabled,
        SyncDirection::Push,
    )
    .await?;
    stats.tasks = upsert::sync_tasks(
        local_db,
        &remote_db,
        last_pushed_at,
        conflict_guard_enabled,
        SyncDirection::Push,
    )
    .await?;
    stats.vault_entries = upsert::sync_assets(
        local_db,
        &remote_db,
        last_pushed_at,
        conflict_guard_enabled,
        SyncDirection::Push,
    )
    .await?
    .vault_entries;

    let append_only =
        upsert::sync_append_only(local_db, &remote_db, last_pushed_at, SyncDirection::Push).await?;
    stats.tags = append_only.tags;
    stats.task_activity_logs = append_only.task_activity_logs;
    stats.project_activity_logs = append_only.project_activity_logs;

    let relations = upsert::sync_relations(
        local_db,
        &remote_db,
        last_pushed_at,
        conflict_guard_enabled,
        SyncDirection::Push,
    )
    .await?;
    stats.task_tags = relations.task_tags;
    stats.task_links = relations.task_links;
    stats.project_tags = relations.project_tags;
    stats.project_links = relations.project_links;

    watermarks::write_last_pushed_at(local_db, database_url, current_sync_start).await?;

    Ok(stats.into_command_report(current_sync_start, conflict_guard_enabled))
}
