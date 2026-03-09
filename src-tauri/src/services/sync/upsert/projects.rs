//! `projects` 主表同步。
//!
//! 这一层和 `spaces` 基本同构，只是更新列更多，
//! 因为项目还携带父级、路径、统计字段等业务数据。

use std::collections::HashMap;

use sea_orm::{
    sea_query::OnConflict, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect,
};

use crate::db::entities::{prelude::Projects, projects};
use crate::services::sync::{
    error::SyncError,
    helpers::{decide_upsert, UpsertDecision},
    report::UpsertStats,
};

use super::SyncDirection;

/// 同步 `projects` 表。
pub(super) async fn sync(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<UpsertStats, SyncError> {
    // 项目表按 `updated_at` 增量读取，避免每次全量拉取项目树。
    let source_items = Projects::find()
        .filter(projects::Column::UpdatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "Projects", error))?;

    let total = source_items.len();
    // 目标端版本号决定这次是插入、更新还是冲突跳过。
    let existing_versions: HashMap<String, i64> = if source_items.is_empty() {
        HashMap::new()
    } else {
        Projects::find()
            .select_only()
            .columns([projects::Column::Id, projects::Column::UpdatedAt])
            .filter(
                projects::Column::Id.is_in(
                    source_items
                        .iter()
                        .map(|item| item.id.clone())
                        .collect::<Vec<_>>(),
                ),
            )
            .into_tuple::<(String, i64)>()
            .all(target_db)
            .await
            .map_err(|error| SyncError::target_state_read(direction.as_str(), "Projects", error))?
            .into_iter()
            .collect()
    };

    let mut stats = UpsertStats {
        total,
        ..Default::default()
    };
    for item in source_items {
        match decide_upsert(
            existing_versions.get(&item.id).copied(),
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

        // 项目路径和统计字段都允许被较新的源端数据覆盖。
        let active_model: projects::ActiveModel = item.into();
        projects::Entity::insert(active_model)
            .on_conflict(
                OnConflict::column(projects::Column::Id)
                    .update_columns([
                        projects::Column::UpdatedAt,
                        projects::Column::ParentId,
                        projects::Column::SpaceId,
                        projects::Column::Path,
                        projects::Column::Title,
                        projects::Column::Note,
                        projects::Column::Priority,
                        projects::Column::TodoTaskCount,
                        projects::Column::DoneTaskCount,
                        projects::Column::LastTaskUpdatedAt,
                        projects::Column::ArchivedAt,
                        projects::Column::DeletedAt,
                        projects::Column::Rank,
                    ])
                    .to_owned(),
            )
            .exec(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "Project", error))?;
    }

    Ok(stats)
}
