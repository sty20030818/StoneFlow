use std::collections::HashMap;

use sea_orm::{
    sea_query::OnConflict, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect,
};

use crate::db::entities::{prelude::Projects, projects};
use crate::services::sync::{
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
) -> Result<UpsertStats, String> {
    let source_items = Projects::find()
        .filter(projects::Column::UpdatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| format!("{}: {}", direction.read_source_error("Projects"), error))?;

    let total = source_items.len();
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
            .map_err(|error| {
                format!(
                    "{}: {}",
                    direction.read_target_existing_error("Projects"),
                    error
                )
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
            .map_err(|error| format!("{}: {}", direction.write_target_error("Project"), error))?;
    }

    Ok(stats)
}
