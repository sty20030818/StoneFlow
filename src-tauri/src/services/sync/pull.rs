use sea_orm::DatabaseConnection;

use super::{
    connection,
    error::SyncError,
    helpers,
    report::SyncRunStats,
    upsert::{self, SyncDirection},
    watermarks,
};

pub(super) async fn pull(
    local_db: &DatabaseConnection,
    database_url: &str,
) -> Result<super::SyncCommandReport, SyncError> {
    let remote_db = connection::get_remote_db(database_url).await?;
    let current_sync_start = chrono::Utc::now().timestamp_millis();
    let last_pulled_at = watermarks::read_last_pulled_at(local_db).await?;
    let conflict_guard_enabled = helpers::is_conflict_guard_enabled();

    let mut stats = SyncRunStats::default();
    stats.spaces = upsert::sync_spaces(
        &remote_db,
        local_db,
        last_pulled_at,
        conflict_guard_enabled,
        SyncDirection::Pull,
    )
    .await?;
    stats.projects = upsert::sync_projects(
        &remote_db,
        local_db,
        last_pulled_at,
        conflict_guard_enabled,
        SyncDirection::Pull,
    )
    .await?;

    let append_only =
        upsert::sync_append_only(&remote_db, local_db, last_pulled_at, SyncDirection::Pull).await?;
    stats.tags = append_only.tags;
    stats.task_activity_logs = append_only.task_activity_logs;

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

    let relations = upsert::sync_relations(&remote_db, local_db, SyncDirection::Pull).await?;
    stats.task_tags = relations.task_tags;
    stats.task_links = relations.task_links;
    stats.project_tags = relations.project_tags;
    stats.project_links = relations.project_links;

    watermarks::write_last_pulled_at(local_db, current_sync_start).await?;

    Ok(stats.into_command_report(current_sync_start, conflict_guard_enabled))
}
