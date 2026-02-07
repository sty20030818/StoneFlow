//! 远程同步命令（本地 SQLite <-> Neon/Postgres）。
//!
//! 重点：
//! - 本文件采用“按更新时间增量同步 + upsert”策略
//! - 使用 app_settings 记录 last_pushed_at / last_pulled_at 水位
//! - 当前策略偏实用，后续可演进为更严格的冲突解决

use crate::db::entities::{prelude::*, *};
use crate::db::{migrator::Migrator, DbState};
use sea_orm::{
    sea_query::OnConflict, ColumnTrait, ConnectOptions, Database, EntityTrait, QueryFilter, Set,
};
use sea_orm_migration::MigratorTrait;
// 定义常量 Key
const KEY_LAST_PUSHED_AT: &str = "last_pushed_at";
const KEY_LAST_PULLED_AT: &str = "last_pulled_at";

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseUrlArgs {
    pub database_url: String,
}

/// 辅助函数：获取远程连接 (复用)
async fn get_remote_db(database_url: &str) -> Result<sea_orm::DatabaseConnection, String> {
    let database_url = database_url.trim();
    if database_url.is_empty() {
        return Err("数据库地址为空".to_string());
    }

    let mut opt = ConnectOptions::new(database_url.to_string());
    opt.max_connections(100)
        .min_connections(5)
        .connect_timeout(std::time::Duration::from_secs(8))
        .acquire_timeout(std::time::Duration::from_secs(8))
        .idle_timeout(std::time::Duration::from_secs(8));

    // 重点：先连上远端，再确保远端 schema 已迁移到最新版本。
    let db = Database::connect(opt)
        .await
        .map_err(|e| format!("连接远程数据库失败: {}", e))?;

    Migrator::up(&db, None)
        .await
        .map_err(|e| format!("远程数据库迁移失败: {}", e))?;

    Ok(db)
}

/// 辅助函数：获取所有的 App Settings (如同步时间戳)
async fn get_sync_time(db: &sea_orm::DatabaseConnection, key: &str) -> Result<i64, sea_orm::DbErr> {
    let setting = AppSettings::find_by_id(key).one(db).await?;
    if let Some(s) = setting {
        Ok(s.value.parse::<i64>().unwrap_or(0))
    } else {
        Ok(0)
    }
}

/// 辅助函数：更新同步时间戳
async fn update_sync_time(
    db: &sea_orm::DatabaseConnection,
    key: &str,
    time: i64,
) -> Result<(), sea_orm::DbErr> {
    let setting = AppSettings::find_by_id(key).one(db).await?;
    let mut active_model = if let Some(s) = setting {
        s.into()
    } else {
        app_settings::ActiveModel {
            key: Set(key.to_string()),
            ..Default::default()
        }
    };
    active_model.value = Set(time.to_string());

    // 使用 OnConflict 做幂等 upsert，避免重复写入报错。
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

/// -------------------------------------------------------------------------
/// Command: Pull from Neon (下载)
/// -------------------------------------------------------------------------
#[tauri::command(rename_all = "camelCase")]
pub async fn pull_from_neon(
    state: tauri::State<'_, DbState>,
    args: DatabaseUrlArgs,
) -> Result<i64, String> {
    let local_db = &state.conn;
    let remote_db = get_remote_db(&args.database_url).await?;

    let current_sync_start = chrono::Utc::now().timestamp_millis();
    let last_pulled_at = get_sync_time(local_db, KEY_LAST_PULLED_AT)
        .await
        .map_err(|e| format!("读取本地 last_pulled_at 失败: {}", e))?;

    // 重点：按 last_pulled_at 增量拉取，减小网络与写入成本。
    // 1. 同步 Spaces
    let remote_spaces = Spaces::find()
        .filter(spaces::Column::UpdatedAt.gt(last_pulled_at))
        .all(&remote_db)
        .await
        .map_err(|e| format!("拉取远程 Spaces 失败: {}", e))?;

    for m in remote_spaces {
        let am: spaces::ActiveModel = m.into();
        spaces::Entity::insert(am)
            .on_conflict(
                OnConflict::column(spaces::Column::Id)
                    .update_columns([
                        spaces::Column::UpdatedAt,
                        spaces::Column::Name,
                        spaces::Column::Order,
                    ])
                    .to_owned(),
            )
            .exec(local_db)
            .await
            .map_err(|e| format!("同步 Space 到本地失败: {}", e))?;
    }

    // 2. 同步 Projects
    // 简单策略：直接 Upsert；冲突时以远端较新数据覆盖本地。
    let remote_projects = Projects::find()
        .filter(projects::Column::UpdatedAt.gt(last_pulled_at))
        .all(&remote_db)
        .await
        .map_err(|e| format!("拉取远程 Projects 失败: {}", e))?;

    for m in remote_projects {
        let am: projects::ActiveModel = m.into();
        projects::Entity::insert(am)
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
            .exec(local_db)
            .await
            .map_err(|e| format!("同步 Project 到本地失败: {}", e))?;
    }

    // 3. 同步 Tags
    let remote_tags = Tags::find()
        .filter(tags::Column::CreatedAt.gt(last_pulled_at))
        .all(&remote_db)
        .await
        .map_err(|e| format!("拉取远程 Tags 失败: {}", e))?;

    for m in remote_tags {
        let am: tags::ActiveModel = m.into();
        let _ = tags::Entity::insert(am)
            .on_conflict(OnConflict::column(tags::Column::Id).do_nothing().to_owned())
            .exec_without_returning(local_db)
            .await;
    }

    // 4. 同步 Links
    let remote_links = Links::find()
        .filter(links::Column::UpdatedAt.gt(last_pulled_at))
        .all(&remote_db)
        .await
        .map_err(|e| format!("拉取远程 Links 失败: {}", e))?;

    for m in remote_links {
        let am: links::ActiveModel = m.into();
        links::Entity::insert(am)
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
            .exec(local_db)
            .await
            .map_err(|e| format!("同步 Link 到本地失败: {}", e))?;
    }

    // 5. 同步 Tasks
    let remote_tasks = Tasks::find()
        .filter(tasks::Column::UpdatedAt.gt(last_pulled_at))
        .all(&remote_db)
        .await
        .map_err(|e| format!("拉取远程 Tasks 失败: {}", e))?;

    for m in remote_tasks {
        let am: tasks::ActiveModel = m.into();
        tasks::Entity::insert(am)
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
            .exec(local_db)
            .await
            .map_err(|e| format!("同步 Task 到本地失败: {}", e))?;
    }

    // 6. 同步关联表 (Full Fetch simplified)
    // 总是尝试拉取远程的所有关联（或可优化为只拉取对应 Task 的？但难以追踪删除）。
    // 简化：全部拉取并覆盖（Ignore exist）。
    {
        let remote_items = TaskTags::find().all(&remote_db).await.unwrap_or_default();
        if !remote_items.is_empty() {
            let models: Vec<task_tags::ActiveModel> =
                remote_items.into_iter().map(|m| m.into()).collect();
            for m in models {
                let _ = task_tags::Entity::insert(m)
                    .on_conflict(
                        OnConflict::columns([task_tags::Column::TaskId, task_tags::Column::TagId])
                            .do_nothing()
                            .to_owned(),
                    )
                    .exec(local_db)
                    .await;
            }
        }
        // TODO: 可按需补充其他关联表 TaskLinks, ProjectTags, ProjectLinks
    }

    // 重点：只有本轮主要流程成功后才推进同步水位。
    // 更新时间戳
    update_sync_time(local_db, KEY_LAST_PULLED_AT, current_sync_start)
        .await
        .map_err(|e| format!("更新 last_pulled_at 失败: {}", e))?;

    Ok(current_sync_start)
}

/// -------------------------------------------------------------------------
/// Command: Push to Neon (上传)
/// -------------------------------------------------------------------------
#[tauri::command(rename_all = "camelCase")]
pub async fn push_to_neon(
    state: tauri::State<'_, DbState>,
    args: DatabaseUrlArgs,
) -> Result<i64, String> {
    let local_db = &state.conn;
    let remote_db = get_remote_db(&args.database_url).await?;

    let current_sync_start = chrono::Utc::now().timestamp_millis();
    let last_pushed_at = get_sync_time(local_db, KEY_LAST_PUSHED_AT)
        .await
        .map_err(|e| format!("读取本地 last_pushed_at 失败: {}", e))?;

    // push 与 pull 对称：读取本地增量，写入远端。
    // 1. 推送 Spaces
    let local_spaces = Spaces::find()
        .filter(spaces::Column::UpdatedAt.gt(last_pushed_at))
        .all(local_db)
        .await
        .map_err(|e| format!("读取本地 Spaces 失败: {}", e))?;

    for m in local_spaces {
        let am: spaces::ActiveModel = m.into();
        spaces::Entity::insert(am)
            .on_conflict(
                OnConflict::column(spaces::Column::Id)
                    .update_columns([
                        spaces::Column::UpdatedAt,
                        spaces::Column::Name,
                        spaces::Column::Order,
                    ])
                    .to_owned(),
            )
            .exec(&remote_db)
            .await
            .map_err(|e| format!("推送 Space 到远程失败: {}", e))?;
    }

    // 2. 推送 Projects
    let local_projects = Projects::find()
        .filter(projects::Column::UpdatedAt.gt(last_pushed_at))
        .all(local_db)
        .await
        .map_err(|e| format!("读取本地 Projects 失败: {}", e))?;

    for m in local_projects {
        let am: projects::ActiveModel = m.into();
        projects::Entity::insert(am)
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
            .exec(&remote_db)
            .await
            .map_err(|e| format!("推送 Project 到远程失败: {}", e))?;
    }

    // 3. 推送 Tags
    let local_tags = Tags::find()
        .filter(tags::Column::CreatedAt.gt(last_pushed_at))
        .all(local_db)
        .await
        .map_err(|e| format!("读取本地 Tags 失败: {}", e))?;

    for m in local_tags {
        let am: tags::ActiveModel = m.into();
        let _ = tags::Entity::insert(am)
            .on_conflict(OnConflict::column(tags::Column::Id).do_nothing().to_owned())
            .exec_without_returning(&remote_db)
            .await;
    }

    // 4. 推送 Links
    let local_links = Links::find()
        .filter(links::Column::UpdatedAt.gt(last_pushed_at))
        .all(local_db)
        .await
        .map_err(|e| format!("读取本地 Links 失败: {}", e))?;

    for m in local_links {
        let am: links::ActiveModel = m.into();
        links::Entity::insert(am)
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
            .exec(&remote_db)
            .await
            .map_err(|e| format!("推送 Link 到远程失败: {}", e))?;
    }

    // 5. 推送 Tasks
    let local_tasks = Tasks::find()
        .filter(tasks::Column::UpdatedAt.gt(last_pushed_at))
        .all(local_db)
        .await
        .map_err(|e| format!("读取本地 Tasks 失败: {}", e))?;

    for m in local_tasks {
        let am: tasks::ActiveModel = m.into();
        tasks::Entity::insert(am)
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
            .exec(&remote_db)
            .await
            .map_err(|e| format!("推送 Task 到远程失败: {}", e))?;
    }

    // 6. 推送关联表
    // 简化：全部推送并覆盖（Ignore exist）。
    {
        let local_items = TaskTags::find().all(local_db).await.unwrap_or_default();
        if !local_items.is_empty() {
            let models: Vec<task_tags::ActiveModel> =
                local_items.into_iter().map(|m| m.into()).collect();
            for m in models {
                let _ = task_tags::Entity::insert(m)
                    .on_conflict(
                        OnConflict::columns([task_tags::Column::TaskId, task_tags::Column::TagId])
                            .do_nothing()
                            .to_owned(),
                    )
                    .exec(&remote_db)
                    .await;
            }
        }
    }

    // 重点：最后更新本地 last_pushed_at，避免“部分成功导致水位错位”。
    // 更新时间戳
    update_sync_time(local_db, KEY_LAST_PUSHED_AT, current_sync_start)
        .await
        .map_err(|e| format!("更新 last_pushed_at 失败: {}", e))?;

    Ok(current_sync_start)
}

/// -------------------------------------------------------------------------
/// Command: Test Neon Connection
/// -------------------------------------------------------------------------
#[tauri::command(rename_all = "camelCase")]
pub async fn test_neon_connection(args: DatabaseUrlArgs) -> Result<(), String> {
    let _ = get_remote_db(&args.database_url).await?;
    Ok(())
}
