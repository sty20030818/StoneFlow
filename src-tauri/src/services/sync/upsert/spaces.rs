use std::collections::HashMap;

use sea_orm::{
    sea_query::OnConflict, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect,
};

use crate::db::entities::{prelude::Spaces, spaces};
use crate::services::sync::{
    error::SyncError,
    helpers::{decide_upsert, UpsertDecision},
    report::UpsertStats,
};

use super::SyncDirection;

pub(super) async fn sync(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<UpsertStats, SyncError> {
    let source_items = Spaces::find()
        .filter(spaces::Column::UpdatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "Spaces", error))?;

    let total = source_items.len();
    let existing_versions: HashMap<String, i64> = if source_items.is_empty() {
        HashMap::new()
    } else {
        Spaces::find()
            .select_only()
            .columns([spaces::Column::Id, spaces::Column::UpdatedAt])
            .filter(
                spaces::Column::Id.is_in(
                    source_items
                        .iter()
                        .map(|item| item.id.clone())
                        .collect::<Vec<_>>(),
                ),
            )
            .into_tuple::<(String, i64)>()
            .all(target_db)
            .await
            .map_err(|error| SyncError::target_state_read(direction.as_str(), "Spaces", error))?
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

        let active_model: spaces::ActiveModel = item.into();
        spaces::Entity::insert(active_model)
            .on_conflict(
                OnConflict::column(spaces::Column::Id)
                    .update_columns([
                        spaces::Column::UpdatedAt,
                        spaces::Column::Name,
                        spaces::Column::Order,
                    ])
                    .to_owned(),
            )
            .exec(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "Space", error))?;
    }

    Ok(stats)
}
