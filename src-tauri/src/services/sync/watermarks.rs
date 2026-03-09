//! 同步水位读写。
//!
//! 水位可以理解为“上一次成功同步到哪里”的时间戳。
//! pull 和 push 各自维护一条水位，避免互相污染。

use sea_orm::{sea_query::OnConflict, EntityTrait, Set};

use crate::db::entities::{app_settings, prelude::AppSettings};

use super::error::SyncError;

const KEY_LAST_PUSHED_AT: &str = "last_pushed_at";
const KEY_LAST_PULLED_AT: &str = "last_pulled_at";

/// 读取指定 key 的同步水位。
///
/// 这是底层原语，公开入口会在外层继续包一层更明确的 pull/push 语义。
async fn read_sync_time(
    db: &sea_orm::DatabaseConnection,
    key: &str,
) -> Result<i64, sea_orm::DbErr> {
    // 水位不存在时返回 0，表示第一次全量视角同步。
    let setting = AppSettings::find_by_id(key).one(db).await?;
    if let Some(setting) = setting {
        setting.value.parse::<i64>().map_err(|error| {
            sea_orm::DbErr::Custom(format!(
                "解析同步时间失败 key={} value={} error={}",
                key, setting.value, error
            ))
        })
    } else {
        Ok(0)
    }
}

/// 写入指定 key 的同步水位。
async fn write_sync_time(
    db: &sea_orm::DatabaseConnection,
    key: &str,
    time: i64,
) -> Result<(), sea_orm::DbErr> {
    // 这里用 upsert，是因为第一次写和后续更新共用同一条路径。
    let setting = AppSettings::find_by_id(key).one(db).await?;
    let mut active_model = if let Some(setting) = setting {
        setting.into()
    } else {
        app_settings::ActiveModel {
            key: Set(key.to_string()),
            ..Default::default()
        }
    };
    active_model.value = Set(time.to_string());

    app_settings::Entity::insert(active_model)
        .on_conflict(
            OnConflict::column(app_settings::Column::Key)
                .update_columns([app_settings::Column::Value])
                .to_owned(),
        )
        .exec(db)
        .await?;
    Ok(())
}

/// 读取本地记录的最近一次 pull 水位。
pub(super) async fn read_last_pulled_at(
    db: &sea_orm::DatabaseConnection,
) -> Result<i64, SyncError> {
    read_sync_time(db, KEY_LAST_PULLED_AT)
        .await
        .map_err(|error| SyncError::watermark_read(KEY_LAST_PULLED_AT, error))
}

/// 只有整轮 pull 成功后才推进 `last_pulled_at`，避免部分成功把水位写脏。
pub(super) async fn write_last_pulled_at(
    db: &sea_orm::DatabaseConnection,
    time: i64,
) -> Result<(), SyncError> {
    write_sync_time(db, KEY_LAST_PULLED_AT, time)
        .await
        .map_err(|error| SyncError::watermark_write(KEY_LAST_PULLED_AT, error))
}

/// 读取本地记录的最近一次 push 水位。
pub(super) async fn read_last_pushed_at(
    db: &sea_orm::DatabaseConnection,
) -> Result<i64, SyncError> {
    read_sync_time(db, KEY_LAST_PUSHED_AT)
        .await
        .map_err(|error| SyncError::watermark_read(KEY_LAST_PUSHED_AT, error))
}

/// push 水位和 pull 水位分开维护，避免双向同步时互相覆盖。
pub(super) async fn write_last_pushed_at(
    db: &sea_orm::DatabaseConnection,
    time: i64,
) -> Result<(), SyncError> {
    write_sync_time(db, KEY_LAST_PUSHED_AT, time)
        .await
        .map_err(|error| SyncError::watermark_write(KEY_LAST_PUSHED_AT, error))
}
