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
    // 远端连接和迁移预检先做掉，避免后续跑到一半才失败。
    let remote_db = connection::get_remote_db(database_url).await?;
    let current_sync_start = chrono::Utc::now().timestamp_millis();
    // pull 的增量起点永远由本地记录，因为“拉到哪里了”是本地视角。
    let last_pulled_at = watermarks::read_last_pulled_at(local_db).await?;
    let conflict_guard_enabled = helpers::is_conflict_guard_enabled();

    // 主表先于关联表同步，避免后面插入关系记录时主记录还不存在。
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

    // append-only 表按创建时间增量拉取，不参与版本冲突判断。
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

    // 关系表没有更新时间，当前策略是全量读取 + 主键去重写入。
    let relations = upsert::sync_relations(&remote_db, local_db, SyncDirection::Pull).await?;
    stats.task_tags = relations.task_tags;
    stats.task_links = relations.task_links;
    stats.project_tags = relations.project_tags;
    stats.project_links = relations.project_links;

    // 只有所有阶段都完成后，才允许推进 pull 水位。
    watermarks::write_last_pulled_at(local_db, current_sync_start).await?;

    Ok(stats.into_command_report(current_sync_start, conflict_guard_enabled))
}
