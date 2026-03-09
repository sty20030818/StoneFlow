//! `tasks` 主表同步。
//!
//! 任务表是同步里字段最多的一张主表，因此最能体现
//! “先判断版本，再一次性 upsert 全部业务字段”的策略。

use std::collections::HashMap;

use sea_orm::{
    sea_query::OnConflict, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect,
};

use crate::db::entities::{prelude::Tasks, tasks};
use crate::services::sync::{
    error::SyncError,
    helpers::{decide_upsert, UpsertDecision},
    report::UpsertStats,
};

use super::SyncDirection;

/// 同步 `tasks` 表。
pub(super) async fn sync(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<UpsertStats, SyncError> {
    // 任务按更新时间增量同步，避免每轮搬运整张任务表。
    let source_items = Tasks::find()
        .filter(tasks::Column::UpdatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "Tasks", error))?;

    let total = source_items.len();
    // 目标端版本用于冲突保护，防止旧任务覆盖新任务。
    let existing_versions: HashMap<String, i64> = if source_items.is_empty() {
        HashMap::new()
    } else {
        Tasks::find()
            .select_only()
            .columns([tasks::Column::Id, tasks::Column::UpdatedAt])
            .filter(
                tasks::Column::Id.is_in(
                    source_items
                        .iter()
                        .map(|item| item.id.clone())
                        .collect::<Vec<_>>(),
                ),
            )
            .into_tuple::<(String, i64)>()
            .all(target_db)
            .await
            .map_err(|error| SyncError::target_state_read(direction.as_str(), "Tasks", error))?
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

        // 任务的状态、优先级、归档/删除时间、自定义字段都在这里一并覆盖。
        let active_model: tasks::ActiveModel = item.into();
        tasks::Entity::insert(active_model)
            .on_conflict(
                OnConflict::column(tasks::Column::Id)
                    .update_columns([
                        tasks::Column::UpdatedAt,
                        tasks::Column::Title,
                        tasks::Column::Note,
                        tasks::Column::Status,
                        tasks::Column::DoneReason,
                        tasks::Column::Priority,
                        tasks::Column::Rank,
                        tasks::Column::CompletedAt,
                        tasks::Column::DeadlineAt,
                        tasks::Column::ArchivedAt,
                        tasks::Column::DeletedAt,
                        tasks::Column::CustomFields,
                        tasks::Column::ProjectId,
                        tasks::Column::SpaceId,
                    ])
                    .to_owned(),
            )
            .exec(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "Task", error))?;
    }

    Ok(stats)
}
