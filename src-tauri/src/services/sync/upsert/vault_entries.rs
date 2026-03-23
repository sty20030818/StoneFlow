//! `asset_vault_entries` 同步。
//!
//! Vault 条目只同步客户端已经加密过的密文负载，
//! 同步层不理解也不接触任何明文值。

use std::collections::HashMap;

use sea_orm::{
    sea_query::OnConflict, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect,
};

use crate::db::entities::{asset_vault_entries, prelude::AssetVaultEntries};
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
    let source_items = AssetVaultEntries::find()
        .filter(asset_vault_entries::Column::UpdatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "AssetVaultEntries", error))?;

    let total = source_items.len();
    let existing_versions: HashMap<String, i64> = if source_items.is_empty() {
        HashMap::new()
    } else {
        AssetVaultEntries::find()
            .select_only()
            .columns([
                asset_vault_entries::Column::Id,
                asset_vault_entries::Column::UpdatedAt,
            ])
            .filter(
                asset_vault_entries::Column::Id.is_in(
                    source_items
                        .iter()
                        .map(|item| item.id.clone())
                        .collect::<Vec<_>>(),
                ),
            )
            .into_tuple::<(String, i64)>()
            .all(target_db)
            .await
            .map_err(|error| {
                SyncError::target_state_read(direction.as_str(), "AssetVaultEntries", error)
            })?
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

        let active_model: asset_vault_entries::ActiveModel = item.into();
        asset_vault_entries::Entity::insert(active_model)
            .on_conflict(
                OnConflict::column(asset_vault_entries::Column::Id)
                    .update_columns([
                        asset_vault_entries::Column::Name,
                        asset_vault_entries::Column::SecretType,
                        asset_vault_entries::Column::Environment,
                        asset_vault_entries::Column::Value,
                        asset_vault_entries::Column::Folder,
                        asset_vault_entries::Column::Note,
                        asset_vault_entries::Column::Tags,
                        asset_vault_entries::Column::Favorite,
                        asset_vault_entries::Column::SyncState,
                        asset_vault_entries::Column::UpdatedAt,
                    ])
                    .to_owned(),
            )
            .exec(target_db)
            .await
            .map_err(|error| SyncError::write_target(direction.as_str(), "AssetVaultEntry", error))?;
    }

    Ok(stats)
}
