//! append-only 表同步。
//!
//! 这类表的特点是：
//! - 不强调“更新覆盖”
//! - 更强调“把新的记录补齐”
//! - 写入时通常使用 `do_nothing` 来避免重复主键报错

use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, sea_query::OnConflict};

use crate::db::entities::{
    prelude::{ProjectActivityLogs, Tags, TaskActivityLogs},
    project_activity_logs, tags, task_activity_logs,
};
use crate::services::sync::{error::SyncError, report::DedupStats};

use super::{AppendOnlySyncStats, SyncDirection};

/// 同步 append-only 表组。
///
/// 这组表都以“补齐新记录”为主，不做旧记录覆盖。
pub(super) async fn sync(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    direction: SyncDirection,
) -> Result<AppendOnlySyncStats, SyncError> {
    // 先同步标签，再同步任务/项目日志；三者都不依赖版本覆盖策略。
    let tags = sync_tags(source_db, target_db, since_ms, direction).await?;
    let task_activity_logs =
        sync_task_activity_logs(source_db, target_db, since_ms, direction).await?;
    let project_activity_logs =
        sync_project_activity_logs(source_db, target_db, since_ms, direction).await?;

    Ok(AppendOnlySyncStats {
        tags,
        task_activity_logs,
        project_activity_logs,
    })
}

/// 同步标签表。
async fn sync_tags(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    direction: SyncDirection,
) -> Result<DedupStats, SyncError> {
    let source_items = Tags::find()
        .filter(tags::Column::CreatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "Tags", error))?;

    let mut stats = DedupStats {
        total: source_items.len(),
        ..Default::default()
    };
    for item in source_items {
        let active_model: tags::ActiveModel = item.into();
        let inserted = tags::Entity::insert(active_model)
            .on_conflict(OnConflict::column(tags::Column::Id).do_nothing().to_owned())
            .exec_without_returning(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "Tag", error))?;
        stats.inserted += inserted as usize;
    }

    Ok(stats)
}

/// 同步任务活动日志表。
async fn sync_task_activity_logs(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    direction: SyncDirection,
) -> Result<DedupStats, SyncError> {
    let source_items = TaskActivityLogs::find()
        .filter(task_activity_logs::Column::CreatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "TaskActivityLogs", error))?;

    let mut stats = DedupStats {
        total: source_items.len(),
        ..Default::default()
    };
    for item in source_items {
        let active_model: task_activity_logs::ActiveModel = item.into();
        let inserted = task_activity_logs::Entity::insert(active_model)
            .on_conflict(
                OnConflict::column(task_activity_logs::Column::Id)
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "TaskActivityLog", error))?;
        stats.inserted += inserted as usize;
    }

    Ok(stats)
}

/// 同步项目活动日志表。
async fn sync_project_activity_logs(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    direction: SyncDirection,
) -> Result<DedupStats, SyncError> {
    let source_items = ProjectActivityLogs::find()
        .filter(project_activity_logs::Column::CreatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "ProjectActivityLogs", error))?;

    let mut stats = DedupStats {
        total: source_items.len(),
        ..Default::default()
    };
    for item in source_items {
        let active_model: project_activity_logs::ActiveModel = item.into();
        let inserted = project_activity_logs::Entity::insert(active_model)
            .on_conflict(
                OnConflict::column(project_activity_logs::Column::Id)
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(target_db)
            .await
            .map_err(|error| {
                SyncError::write_target(direction.as_str(), "ProjectActivityLog", error)
            })?;
        stats.inserted += inserted as usize;
    }

    Ok(stats)
}
