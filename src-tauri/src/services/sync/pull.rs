//! Pull 编排入口。
//!
//! 阅读这个文件时，可以把它理解成“同步剧本”：
//! 1. 建立远端连接
//! 2. 读取本地 pull 水位
//! 3. 按固定顺序同步各表
//! 4. 全部成功后推进水位
//! 5. 组装最终报告

use sea_orm::DatabaseConnection;

use super::{
    connection,
    error::SyncError,
    helpers,
    report::SyncRunStats,
    upsert::{self, SyncDirection},
    watermarks,
};

/// 执行一次完整的 pull 流程。
///
/// 返回值里的统计信息会按表汇总，供前端展示本轮同步结果。
pub(super) async fn pull(
    local_db: &DatabaseConnection,
    database_url: &str,
) -> Result<super::SyncCommandReport, SyncError> {
    let remote_db = connection::get_remote_db(database_url).await?;
    let current_sync_start = chrono::Utc::now().timestamp_millis();
    let last_pulled_at = watermarks::read_last_pulled_at(local_db, database_url).await?;
    let conflict_guard_enabled = helpers::is_conflict_guard_enabled();

    let spaces = upsert::sync_spaces(
        &remote_db,
        local_db,
        last_pulled_at,
        conflict_guard_enabled,
        SyncDirection::Pull,
    )
    .await?;
    let projects = upsert::sync_projects(
        &remote_db,
        local_db,
        last_pulled_at,
        conflict_guard_enabled,
        SyncDirection::Pull,
    )
    .await?;

    let mut stats = SyncRunStats {
        spaces,
        projects,
        ..Default::default()
    };

    stats.links = upsert::sync_links(
        &remote_db,
        local_db,
        last_pulled_at,
        conflict_guard_enabled,
        SyncDirection::Pull,
    )
    .await?;
    stats.tasks = upsert::sync_tasks(
        &remote_db,
        local_db,
        last_pulled_at,
        conflict_guard_enabled,
        SyncDirection::Pull,
    )
    .await?;
    stats.vault_entries = upsert::sync_assets(
        &remote_db,
        local_db,
        last_pulled_at,
        conflict_guard_enabled,
        SyncDirection::Pull,
    )
    .await?
    .vault_entries;

    let append_only =
        upsert::sync_append_only(&remote_db, local_db, last_pulled_at, SyncDirection::Pull).await?;
    stats.tags = append_only.tags;
    stats.task_activity_logs = append_only.task_activity_logs;
    stats.project_activity_logs = append_only.project_activity_logs;

    let relations = upsert::sync_relations(
        &remote_db,
        local_db,
        last_pulled_at,
        conflict_guard_enabled,
        SyncDirection::Pull,
    )
    .await?;
    stats.task_tags = relations.task_tags;
    stats.task_links = relations.task_links;
    stats.project_tags = relations.project_tags;
    stats.project_links = relations.project_links;

    watermarks::write_last_pulled_at(local_db, database_url, current_sync_start).await?;

    Ok(stats.into_command_report(current_sync_start, conflict_guard_enabled))
}
