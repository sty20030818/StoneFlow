//! 关系表同步。
//!
//! 当前这些表都没有 `updated_at`，因此没法做真正的增量覆盖。
//! 当前策略选择“全量读取 + 主键去重插入”，优先保证实现简单和结果幂等。

use sea_orm::{sea_query::OnConflict, DatabaseConnection, EntityTrait};

use crate::db::entities::{
    prelude::{ProjectLinks, ProjectTags, TaskLinks, TaskTags},
    project_links, project_tags, task_links, task_tags,
};
use crate::services::sync::{error::SyncError, report::DedupStats};

use super::{RelationSyncStats, SyncDirection};

/// 同步所有关系表。
pub(super) async fn sync(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<RelationSyncStats, SyncError> {
    // 这里串行执行是为了让统计逻辑和错误定位更直接。
    Ok(RelationSyncStats {
        task_tags: sync_task_tags(source_db, target_db, direction).await?,
        task_links: sync_task_links(source_db, target_db, direction).await?,
        project_tags: sync_project_tags(source_db, target_db, direction).await?,
        project_links: sync_project_links(source_db, target_db, direction).await?,
    })
}

/// 同步任务与标签的关联关系。
async fn sync_task_tags(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<DedupStats, SyncError> {
    // 关系表没有版本列，所以直接全量取出源端数据。
    let source_items = TaskTags::find()
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "TaskTags", error))?;

    let mut stats = DedupStats {
        total: source_items.len(),
        ..Default::default()
    };
    for item in source_items {
        // 复合主键冲突时直接忽略，保证多次同步是幂等的。
        let active_model: task_tags::ActiveModel = item.into();
        let inserted = task_tags::Entity::insert(active_model)
            .on_conflict(
                OnConflict::columns([task_tags::Column::TaskId, task_tags::Column::TagId])
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "TaskTag", error))?;
        stats.inserted += inserted as usize;
    }

    Ok(stats)
}

/// 同步任务与链接的关联关系。
async fn sync_task_links(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<DedupStats, SyncError> {
    let source_items = TaskLinks::find()
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "TaskLinks", error))?;

    let mut stats = DedupStats {
        total: source_items.len(),
        ..Default::default()
    };
    for item in source_items {
        let active_model: task_links::ActiveModel = item.into();
        let inserted = task_links::Entity::insert(active_model)
            .on_conflict(
                OnConflict::columns([task_links::Column::TaskId, task_links::Column::LinkId])
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "TaskLink", error))?;
        stats.inserted += inserted as usize;
    }

    Ok(stats)
}

/// 同步项目与标签的关联关系。
async fn sync_project_tags(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<DedupStats, SyncError> {
    let source_items = ProjectTags::find()
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "ProjectTags", error))?;

    let mut stats = DedupStats {
        total: source_items.len(),
        ..Default::default()
    };
    for item in source_items {
        let active_model: project_tags::ActiveModel = item.into();
        let inserted = project_tags::Entity::insert(active_model)
            .on_conflict(
                OnConflict::columns([project_tags::Column::ProjectId, project_tags::Column::TagId])
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "ProjectTag", error))?;
        stats.inserted += inserted as usize;
    }

    Ok(stats)
}

/// 同步项目与链接的关联关系。
async fn sync_project_links(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<DedupStats, SyncError> {
    let source_items = ProjectLinks::find()
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "ProjectLinks", error))?;

    let mut stats = DedupStats {
        total: source_items.len(),
        ..Default::default()
    };
    for item in source_items {
        let active_model: project_links::ActiveModel = item.into();
        let inserted = project_links::Entity::insert(active_model)
            .on_conflict(
                OnConflict::columns([
                    project_links::Column::ProjectId,
                    project_links::Column::LinkId,
                ])
                .do_nothing()
                .to_owned(),
            )
            .exec_without_returning(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "ProjectLink", error))?;
        stats.inserted += inserted as usize;
    }

    Ok(stats)
}
