//! `spaces` 主表同步。
//!
//! 这是标准的“增量读取 + 冲突保护 + upsert”模板，
//! `projects / links / tasks` 也是同一类思路。

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

/// 同步 `spaces` 表。
///
/// 这个函数展示了主表同步的标准模板：读增量、查目标端版本、决定 upsert 路径、累计统计。
pub(super) async fn sync(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    since_ms: i64,
    conflict_guard_enabled: bool,
    direction: SyncDirection,
) -> Result<UpsertStats, SyncError> {
    // 先按更新时间读取源端增量数据。
    let source_items = Spaces::find()
        .filter(spaces::Column::UpdatedAt.gt(since_ms))
        .all(source_db)
        .await
        .map_err(|error| SyncError::source_read(direction.as_str(), "Spaces", error))?;

    let total = source_items.len();
    // 再从目标端拿到同一批 id 的版本号，用来判断 insert / update / skip。
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
        // 冲突保护开启时，旧数据不会覆盖目标端更新的数据。
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

        // 真正写入目标端时统一走 upsert，避免 insert / update 双路径分叉。
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
