use sea_orm::{sea_query::OnConflict, EntityTrait, Set};

use crate::db::entities::{app_settings, prelude::AppSettings};

use super::error::SyncError;

const KEY_LAST_PUSHED_AT: &str = "last_pushed_at";
const KEY_LAST_PULLED_AT: &str = "last_pulled_at";

async fn read_sync_time(
    db: &sea_orm::DatabaseConnection,
    key: &str,
) -> Result<i64, sea_orm::DbErr> {
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

async fn write_sync_time(
    db: &sea_orm::DatabaseConnection,
    key: &str,
    time: i64,
) -> Result<(), sea_orm::DbErr> {
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

pub(super) async fn read_last_pulled_at(
    db: &sea_orm::DatabaseConnection,
) -> Result<i64, SyncError> {
    read_sync_time(db, KEY_LAST_PULLED_AT)
        .await
        .map_err(|error| SyncError::watermark_read(KEY_LAST_PULLED_AT, error))
}

pub(super) async fn write_last_pulled_at(
    db: &sea_orm::DatabaseConnection,
    time: i64,
) -> Result<(), SyncError> {
    write_sync_time(db, KEY_LAST_PULLED_AT, time)
        .await
        .map_err(|error| SyncError::watermark_write(KEY_LAST_PULLED_AT, error))
}

pub(super) async fn read_last_pushed_at(
    db: &sea_orm::DatabaseConnection,
) -> Result<i64, SyncError> {
    read_sync_time(db, KEY_LAST_PUSHED_AT)
        .await
        .map_err(|error| SyncError::watermark_read(KEY_LAST_PUSHED_AT, error))
}

pub(super) async fn write_last_pushed_at(
    db: &sea_orm::DatabaseConnection,
    time: i64,
) -> Result<(), SyncError> {
    write_sync_time(db, KEY_LAST_PUSHED_AT, time)
        .await
        .map_err(|error| SyncError::watermark_write(KEY_LAST_PUSHED_AT, error))
}
