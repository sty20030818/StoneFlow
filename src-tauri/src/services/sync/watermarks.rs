//! 同步水位读写。
//!
//! 水位可以理解为“上一次成功同步到哪里”的时间戳。
//! pull 和 push 各自维护一条水位，避免互相污染。
//! 多 profile 场景下，水位还需要按远端数据库隔离，避免不同数据库互相串台。

use sea_orm::{EntityTrait, Set, sea_query::OnConflict};

use crate::db::entities::{app_settings, prelude::AppSettings};

use super::error::SyncError;

const KEY_LAST_PUSHED_AT: &str = "last_pushed_at";
const KEY_LAST_PULLED_AT: &str = "last_pulled_at";
const FNV_OFFSET_BASIS: u64 = 0xcbf29ce484222325;
const FNV_PRIME: u64 = 0x100000001b3;

/// 读取指定 key 的同步水位。
async fn read_sync_time_optional(
    db: &sea_orm::DatabaseConnection,
    key: &str,
) -> Result<Option<i64>, sea_orm::DbErr> {
    let setting = AppSettings::find_by_id(key).one(db).await?;
    setting
        .map(|setting| {
            setting.value.parse::<i64>().map_err(|error| {
                sea_orm::DbErr::Custom(format!(
                    "解析同步时间失败 key={} value={} error={}",
                    key, setting.value, error
                ))
            })
        })
        .transpose()
}

/// 不存在时返回 0，表示第一次全量视角同步。
async fn read_sync_time(
    db: &sea_orm::DatabaseConnection,
    key: &str,
) -> Result<i64, sea_orm::DbErr> {
    Ok(read_sync_time_optional(db, key).await?.unwrap_or(0))
}

/// 写入指定 key 的同步水位。
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

/// 用稳定哈希把 database_url 折叠成可持久化的 profile 指纹。
fn profile_fingerprint(database_url: &str) -> String {
    let mut hash = FNV_OFFSET_BASIS;
    for byte in database_url.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(FNV_PRIME);
    }
    format!("{hash:016x}")
}

fn build_scoped_key(base_key: &str, database_url: &str) -> String {
    format!("{base_key}::{}", profile_fingerprint(database_url))
}

async fn read_scoped_sync_time(
    db: &sea_orm::DatabaseConnection,
    base_key: &str,
    database_url: &str,
) -> Result<i64, SyncError> {
    let scoped_key = build_scoped_key(base_key, database_url);
    let scoped_value = read_sync_time_optional(db, &scoped_key)
        .await
        .map_err(|error| SyncError::watermark_read(scoped_key.clone(), error))?;

    if let Some(value) = scoped_value {
        Ok(value)
    } else {
        // 兼容单 profile 旧数据：首次切换到新 key 时允许回退读取旧全局水位。
        read_sync_time(db, base_key)
            .await
            .map_err(|error| SyncError::watermark_read(scoped_key, error))
    }
}

async fn write_scoped_sync_time(
    db: &sea_orm::DatabaseConnection,
    base_key: &str,
    database_url: &str,
    time: i64,
) -> Result<(), SyncError> {
    let scoped_key = build_scoped_key(base_key, database_url);
    write_sync_time(db, &scoped_key, time)
        .await
        .map_err(|error| SyncError::watermark_write(scoped_key, error))
}

/// 读取本地记录的最近一次 pull 水位。
pub(super) async fn read_last_pulled_at(
    db: &sea_orm::DatabaseConnection,
    database_url: &str,
) -> Result<i64, SyncError> {
    read_scoped_sync_time(db, KEY_LAST_PULLED_AT, database_url).await
}

/// 只有整轮 pull 成功后才推进 `last_pulled_at`，避免部分成功把水位写脏。
pub(super) async fn write_last_pulled_at(
    db: &sea_orm::DatabaseConnection,
    database_url: &str,
    time: i64,
) -> Result<(), SyncError> {
    write_scoped_sync_time(db, KEY_LAST_PULLED_AT, database_url, time).await
}

/// 读取本地记录的最近一次 push 水位。
pub(super) async fn read_last_pushed_at(
    db: &sea_orm::DatabaseConnection,
    database_url: &str,
) -> Result<i64, SyncError> {
    read_scoped_sync_time(db, KEY_LAST_PUSHED_AT, database_url).await
}

/// push 水位和 pull 水位分开维护，避免双向同步时互相覆盖。
pub(super) async fn write_last_pushed_at(
    db: &sea_orm::DatabaseConnection,
    database_url: &str,
    time: i64,
) -> Result<(), SyncError> {
    write_scoped_sync_time(db, KEY_LAST_PUSHED_AT, database_url, time).await
}
