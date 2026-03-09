use std::collections::HashMap;

use sea_orm::{
    sea_query::OnConflict, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect,
};

use crate::db::entities::{links, prelude::Links};
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
    let source_items = Links::find()
        .filter(links::Column::UpdatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "Links", error))?;

    let total = source_items.len();
    let existing_versions: HashMap<String, i64> = if source_items.is_empty() {
        HashMap::new()
    } else {
        Links::find()
            .select_only()
            .columns([links::Column::Id, links::Column::UpdatedAt])
            .filter(
                links::Column::Id.is_in(
                    source_items
                        .iter()
                        .map(|item| item.id.clone())
                        .collect::<Vec<_>>(),
                ),
            )
            .into_tuple::<(String, i64)>()
            .all(target_db)
            .await
            .map_err(|error| SyncError::target_state_read(direction.as_str(), "Links", error))?
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

        let active_model: links::ActiveModel = item.into();
        links::Entity::insert(active_model)
            .on_conflict(
                OnConflict::column(links::Column::Id)
                    .update_columns([
                        links::Column::UpdatedAt,
                        links::Column::Title,
                        links::Column::Url,
                        links::Column::Rank,
                        links::Column::Kind,
                    ])
                    .to_owned(),
            )
            .exec(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "Link", error))?;
    }

    Ok(stats)
}
