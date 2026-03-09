use sea_orm::{sea_query::OnConflict, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};

use crate::db::entities::{
    prelude::{Tags, TaskActivityLogs},
    tags, task_activity_logs,
};
use crate::services::sync::{error::SyncError, report::DedupStats};

use super::{AppendOnlySyncStats, SyncDirection};

pub(super) async fn sync(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    direction: SyncDirection,
) -> Result<AppendOnlySyncStats, SyncError> {
    let tags = sync_tags(source_db, target_db, since_ms, direction).await?;
    let task_activity_logs =
        sync_task_activity_logs(source_db, target_db, since_ms, direction).await?;

    Ok(AppendOnlySyncStats {
        tags,
        task_activity_logs,
    })
}

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
            .map_err(|error| {
                SyncError::write_target(direction.as_str(), "TaskActivityLog", error)
            })?;
        stats.inserted += inserted as usize;
    }

    Ok(stats)
}
