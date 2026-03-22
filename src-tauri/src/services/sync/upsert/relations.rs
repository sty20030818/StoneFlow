//! 关系表同步。
//!
//! 关系表现在带有 `updated_at` 和 `deleted_at`，
//! 因此可以按增量读取并把 tombstone 传播到目标端，保证最终一致。

use std::collections::HashMap;

use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect, sea_query::OnConflict,
};

use crate::db::entities::{
    prelude::{ProjectLinks, ProjectTags, TaskLinks, TaskTags},
    project_links, project_tags, task_links, task_tags,
};
use crate::services::sync::{
    error::SyncError,
    helpers::{UpsertDecision, decide_upsert},
    report::UpsertStats,
};

use super::{RelationSyncStats, SyncDirection};

/// 同步所有关系表。
pub(super) async fn sync(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<RelationSyncStats, SyncError> {
    Ok(RelationSyncStats {
        task_tags: sync_task_tags(
            source_db,
            target_db,
            since_ms,
            conflict_guard_enabled,
            direction,
        )
        .await?,
        task_links: sync_task_links(
            source_db,
            target_db,
            since_ms,
            conflict_guard_enabled,
            direction,
        )
        .await?,
        project_tags: sync_project_tags(
            source_db,
            target_db,
            since_ms,
            conflict_guard_enabled,
            direction,
        )
        .await?,
        project_links: sync_project_links(
            source_db,
            target_db,
            since_ms,
            conflict_guard_enabled,
            direction,
        )
        .await?,
    })
}

async fn sync_task_tags(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<UpsertStats, SyncError> {
    let source_items = TaskTags::find()
        .filter(task_tags::Column::UpdatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "TaskTags", error))?;

    let total = source_items.len();
    let existing_versions: HashMap<(String, String), i64> = if source_items.is_empty() {
        HashMap::new()
    } else {
        TaskTags::find()
            .select_only()
            .columns([
                task_tags::Column::TaskId,
                task_tags::Column::TagId,
                task_tags::Column::UpdatedAt,
            ])
            .filter(task_tags::Column::TaskId.is_in(source_items.iter().map(|item| item.task_id.clone())))
            .filter(task_tags::Column::TagId.is_in(source_items.iter().map(|item| item.tag_id.clone())))
            .into_tuple::<(String, String, i64)>()
            .all(target_db)
            .await
            .map_err(|error| SyncError::target_state_read(direction.as_str(), "TaskTags", error))?
            .into_iter()
            .map(|(task_id, tag_id, updated_at)| ((task_id, tag_id), updated_at))
            .collect()
    };

    let mut stats = UpsertStats {
        total,
        ..Default::default()
    };
    for item in source_items {
        let relation_key = (item.task_id.clone(), item.tag_id.clone());
        match decide_upsert(
            existing_versions.get(&relation_key).copied(),
            item.updated_at,
            conflict_guard_enabled,
        ) {
            UpsertDecision::Insert => stats.inserted += 1,
            UpsertDecision::Update => stats.updated += 1,
            UpsertDecision::ConflictSkip => {
                stats.conflicted += 1;
                continue;
            }
        }

        let active_model: task_tags::ActiveModel = item.into();
        task_tags::Entity::insert(active_model)
            .on_conflict(
                OnConflict::columns([task_tags::Column::TaskId, task_tags::Column::TagId])
                    .update_columns([task_tags::Column::UpdatedAt, task_tags::Column::DeletedAt])
                    .to_owned(),
            )
            .exec(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "TaskTag", error))?;
    }

    Ok(stats)
}

async fn sync_task_links(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<UpsertStats, SyncError> {
    let source_items = TaskLinks::find()
        .filter(task_links::Column::UpdatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "TaskLinks", error))?;

    let total = source_items.len();
    let existing_versions: HashMap<(String, String), i64> = if source_items.is_empty() {
        HashMap::new()
    } else {
        TaskLinks::find()
            .select_only()
            .columns([
                task_links::Column::TaskId,
                task_links::Column::LinkId,
                task_links::Column::UpdatedAt,
            ])
            .filter(task_links::Column::TaskId.is_in(source_items.iter().map(|item| item.task_id.clone())))
            .filter(task_links::Column::LinkId.is_in(source_items.iter().map(|item| item.link_id.clone())))
            .into_tuple::<(String, String, i64)>()
            .all(target_db)
            .await
            .map_err(|error| SyncError::target_state_read(direction.as_str(), "TaskLinks", error))?
            .into_iter()
            .map(|(task_id, link_id, updated_at)| ((task_id, link_id), updated_at))
            .collect()
    };

    let mut stats = UpsertStats {
        total,
        ..Default::default()
    };
    for item in source_items {
        let relation_key = (item.task_id.clone(), item.link_id.clone());
        match decide_upsert(
            existing_versions.get(&relation_key).copied(),
            item.updated_at,
            conflict_guard_enabled,
        ) {
            UpsertDecision::Insert => stats.inserted += 1,
            UpsertDecision::Update => stats.updated += 1,
            UpsertDecision::ConflictSkip => {
                stats.conflicted += 1;
                continue;
            }
        }

        let active_model: task_links::ActiveModel = item.into();
        task_links::Entity::insert(active_model)
            .on_conflict(
                OnConflict::columns([task_links::Column::TaskId, task_links::Column::LinkId])
                    .update_columns([task_links::Column::UpdatedAt, task_links::Column::DeletedAt])
                    .to_owned(),
            )
            .exec(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "TaskLink", error))?;
    }

    Ok(stats)
}

async fn sync_project_tags(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<UpsertStats, SyncError> {
    let source_items = ProjectTags::find()
        .filter(project_tags::Column::UpdatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "ProjectTags", error))?;

    let total = source_items.len();
    let existing_versions: HashMap<(String, String), i64> = if source_items.is_empty() {
        HashMap::new()
    } else {
        ProjectTags::find()
            .select_only()
            .columns([
                project_tags::Column::ProjectId,
                project_tags::Column::TagId,
                project_tags::Column::UpdatedAt,
            ])
            .filter(project_tags::Column::ProjectId.is_in(source_items.iter().map(|item| item.project_id.clone())))
            .filter(project_tags::Column::TagId.is_in(source_items.iter().map(|item| item.tag_id.clone())))
            .into_tuple::<(String, String, i64)>()
            .all(target_db)
            .await
            .map_err(|error| SyncError::target_state_read(direction.as_str(), "ProjectTags", error))?
            .into_iter()
            .map(|(project_id, tag_id, updated_at)| ((project_id, tag_id), updated_at))
            .collect()
    };

    let mut stats = UpsertStats {
        total,
        ..Default::default()
    };
    for item in source_items {
        let relation_key = (item.project_id.clone(), item.tag_id.clone());
        match decide_upsert(
            existing_versions.get(&relation_key).copied(),
            item.updated_at,
            conflict_guard_enabled,
        ) {
            UpsertDecision::Insert => stats.inserted += 1,
            UpsertDecision::Update => stats.updated += 1,
            UpsertDecision::ConflictSkip => {
                stats.conflicted += 1;
                continue;
            }
        }

        let active_model: project_tags::ActiveModel = item.into();
        project_tags::Entity::insert(active_model)
            .on_conflict(
                OnConflict::columns([project_tags::Column::ProjectId, project_tags::Column::TagId])
                    .update_columns([project_tags::Column::UpdatedAt, project_tags::Column::DeletedAt])
                    .to_owned(),
            )
            .exec(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "ProjectTag", error))?;
    }

    Ok(stats)
}

async fn sync_project_links(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<UpsertStats, SyncError> {
    let source_items = ProjectLinks::find()
        .filter(project_links::Column::UpdatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "ProjectLinks", error))?;

    let total = source_items.len();
    let existing_versions: HashMap<(String, String), i64> = if source_items.is_empty() {
        HashMap::new()
    } else {
        ProjectLinks::find()
            .select_only()
            .columns([
                project_links::Column::ProjectId,
                project_links::Column::LinkId,
                project_links::Column::UpdatedAt,
            ])
            .filter(project_links::Column::ProjectId.is_in(source_items.iter().map(|item| item.project_id.clone())))
            .filter(project_links::Column::LinkId.is_in(source_items.iter().map(|item| item.link_id.clone())))
            .into_tuple::<(String, String, i64)>()
            .all(target_db)
            .await
            .map_err(|error| SyncError::target_state_read(direction.as_str(), "ProjectLinks", error))?
            .into_iter()
            .map(|(project_id, link_id, updated_at)| ((project_id, link_id), updated_at))
            .collect()
    };

    let mut stats = UpsertStats {
        total,
        ..Default::default()
    };
    for item in source_items {
        let relation_key = (item.project_id.clone(), item.link_id.clone());
        match decide_upsert(
            existing_versions.get(&relation_key).copied(),
            item.updated_at,
            conflict_guard_enabled,
        ) {
            UpsertDecision::Insert => stats.inserted += 1,
            UpsertDecision::Update => stats.updated += 1,
            UpsertDecision::ConflictSkip => {
                stats.conflicted += 1;
                continue;
            }
        }

        let active_model: project_links::ActiveModel = item.into();
        project_links::Entity::insert(active_model)
            .on_conflict(
                OnConflict::columns([
                    project_links::Column::ProjectId,
                    project_links::Column::LinkId,
                ])
                .update_columns([
                    project_links::Column::UpdatedAt,
                    project_links::Column::DeletedAt,
                ])
                .to_owned(),
            )
            .exec(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "ProjectLink", error))?;
    }

    Ok(stats)
}
