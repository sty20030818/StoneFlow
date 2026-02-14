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

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncTableReport {
    pub total: usize,
    pub synced: usize,
    pub deduped: usize,
}

impl SyncTableReport {
    fn upsert(total: usize, synced: usize) -> Self {
        Self {
            total,
            synced,
            deduped: 0,
        }
    }

    fn dedup(total: usize, synced: usize) -> Self {
        Self {
            total,
            synced,
            deduped: total.saturating_sub(synced),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncTablesReport {
    pub spaces: SyncTableReport,
    pub projects: SyncTableReport,
    pub tags: SyncTableReport,
    pub links: SyncTableReport,
    pub tasks: SyncTableReport,
    pub task_activity_logs: SyncTableReport,
    pub task_tags: SyncTableReport,
    pub task_links: SyncTableReport,
    pub project_tags: SyncTableReport,
    pub project_links: SyncTableReport,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncCommandReport {
    pub synced_at: i64,
    pub tables: SyncTablesReport,
}

/// 辅助函数：获取远程连接 (复用)
async fn get_remote_db(database_url: &str) -> Result<sea_orm::DatabaseConnection, String> {
    let database_url = database_url.trim();
    if database_url.is_empty() {
        return Err("数据库地址为空".to_string());
    }

    let mut opt = ConnectOptions::new(database_url.to_string());
    // 远端同步是“命令式短连接”场景，不需要预热大量连接。
    // 之前 min=5 / max=100 在测试+推送连续触发时容易把 Neon 连接数打满，
    // 进而出现 `pool timed out while waiting for an open connection`。
    opt.max_connections(4)
        .min_connections(0)
        .connect_timeout(std::time::Duration::from_secs(12))
        .acquire_timeout(std::time::Duration::from_secs(20))
        .idle_timeout(std::time::Duration::from_secs(30));

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
) -> Result<SyncCommandReport, String> {
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
    let spaces_total = remote_spaces.len();

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
    let projects_total = remote_projects.len();

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
    let tags_total = remote_tags.len();
    let mut tags_synced = 0usize;

    for m in remote_tags {
        let am: tags::ActiveModel = m.into();
        let exec = tags::Entity::insert(am)
            .on_conflict(OnConflict::column(tags::Column::Id).do_nothing().to_owned())
            .exec_without_returning(local_db)
            .await
            .map_err(|e| format!("同步 Tag 到本地失败: {}", e))?;
        tags_synced += exec as usize;
    }

    // 4. 同步 Links
    let remote_links = Links::find()
        .filter(links::Column::UpdatedAt.gt(last_pulled_at))
        .all(&remote_db)
        .await
        .map_err(|e| format!("拉取远程 Links 失败: {}", e))?;
    let links_total = remote_links.len();

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
    let tasks_total = remote_tasks.len();

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

    // 6. 同步 TaskActivityLogs（日志表 append-only，按 created_at 增量同步）
    let remote_activity_logs = TaskActivityLogs::find()
        .filter(task_activity_logs::Column::CreatedAt.gt(last_pulled_at))
        .all(&remote_db)
        .await
        .map_err(|e| format!("拉取远程 TaskActivityLogs 失败: {}", e))?;
    let task_activity_logs_total = remote_activity_logs.len();
    let mut task_activity_logs_synced = 0usize;

    for m in remote_activity_logs {
        let am: task_activity_logs::ActiveModel = m.into();
        let exec = task_activity_logs::Entity::insert(am)
            .on_conflict(
                OnConflict::column(task_activity_logs::Column::Id)
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(local_db)
            .await
            .map_err(|e| format!("同步 TaskActivityLog 到本地失败: {}", e))?;
        task_activity_logs_synced += exec as usize;
    }

    // 7. 同步关联表（关联表没有更新时间字段，采用全量拉取 + 主键去重写入）
    let remote_task_tags = TaskTags::find()
        .all(&remote_db)
        .await
        .map_err(|e| format!("拉取远程 TaskTags 失败: {}", e))?;
    let task_tags_total = remote_task_tags.len();
    let mut task_tags_synced = 0usize;
    for m in remote_task_tags {
        let am: task_tags::ActiveModel = m.into();
        let exec = task_tags::Entity::insert(am)
            .on_conflict(
                OnConflict::columns([task_tags::Column::TaskId, task_tags::Column::TagId])
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(local_db)
            .await
            .map_err(|e| format!("同步 TaskTag 到本地失败: {}", e))?;
        task_tags_synced += exec as usize;
    }

    let remote_task_links = TaskLinks::find()
        .all(&remote_db)
        .await
        .map_err(|e| format!("拉取远程 TaskLinks 失败: {}", e))?;
    let task_links_total = remote_task_links.len();
    let mut task_links_synced = 0usize;
    for m in remote_task_links {
        let am: task_links::ActiveModel = m.into();
        let exec = task_links::Entity::insert(am)
            .on_conflict(
                OnConflict::columns([task_links::Column::TaskId, task_links::Column::LinkId])
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(local_db)
            .await
            .map_err(|e| format!("同步 TaskLink 到本地失败: {}", e))?;
        task_links_synced += exec as usize;
    }

    let remote_project_tags = ProjectTags::find()
        .all(&remote_db)
        .await
        .map_err(|e| format!("拉取远程 ProjectTags 失败: {}", e))?;
    let project_tags_total = remote_project_tags.len();
    let mut project_tags_synced = 0usize;
    for m in remote_project_tags {
        let am: project_tags::ActiveModel = m.into();
        let exec = project_tags::Entity::insert(am)
            .on_conflict(
                OnConflict::columns([project_tags::Column::ProjectId, project_tags::Column::TagId])
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(local_db)
            .await
            .map_err(|e| format!("同步 ProjectTag 到本地失败: {}", e))?;
        project_tags_synced += exec as usize;
    }

    let remote_project_links = ProjectLinks::find()
        .all(&remote_db)
        .await
        .map_err(|e| format!("拉取远程 ProjectLinks 失败: {}", e))?;
    let project_links_total = remote_project_links.len();
    let mut project_links_synced = 0usize;
    for m in remote_project_links {
        let am: project_links::ActiveModel = m.into();
        let exec = project_links::Entity::insert(am)
            .on_conflict(
                OnConflict::columns([
                    project_links::Column::ProjectId,
                    project_links::Column::LinkId,
                ])
                .do_nothing()
                .to_owned(),
            )
            .exec_without_returning(local_db)
            .await
            .map_err(|e| format!("同步 ProjectLink 到本地失败: {}", e))?;
        project_links_synced += exec as usize;
    }

    // 重点：只有本轮主要流程成功后才推进同步水位。
    // 更新时间戳
    update_sync_time(local_db, KEY_LAST_PULLED_AT, current_sync_start)
        .await
        .map_err(|e| format!("更新 last_pulled_at 失败: {}", e))?;

    Ok(SyncCommandReport {
        synced_at: current_sync_start,
        tables: SyncTablesReport {
            spaces: SyncTableReport::upsert(spaces_total, spaces_total),
            projects: SyncTableReport::upsert(projects_total, projects_total),
            tags: SyncTableReport::dedup(tags_total, tags_synced),
            links: SyncTableReport::upsert(links_total, links_total),
            tasks: SyncTableReport::upsert(tasks_total, tasks_total),
            task_activity_logs: SyncTableReport::dedup(
                task_activity_logs_total,
                task_activity_logs_synced,
            ),
            task_tags: SyncTableReport::dedup(task_tags_total, task_tags_synced),
            task_links: SyncTableReport::dedup(task_links_total, task_links_synced),
            project_tags: SyncTableReport::dedup(project_tags_total, project_tags_synced),
            project_links: SyncTableReport::dedup(project_links_total, project_links_synced),
        },
    })
}

/// -------------------------------------------------------------------------
/// Command: Push to Neon (上传)
/// -------------------------------------------------------------------------
#[tauri::command(rename_all = "camelCase")]
pub async fn push_to_neon(
    state: tauri::State<'_, DbState>,
    args: DatabaseUrlArgs,
) -> Result<SyncCommandReport, String> {
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
    let spaces_total = local_spaces.len();

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
    let projects_total = local_projects.len();

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
    let tags_total = local_tags.len();
    let mut tags_synced = 0usize;

    for m in local_tags {
        let am: tags::ActiveModel = m.into();
        let exec = tags::Entity::insert(am)
            .on_conflict(OnConflict::column(tags::Column::Id).do_nothing().to_owned())
            .exec_without_returning(&remote_db)
            .await
            .map_err(|e| format!("推送 Tag 到远程失败: {}", e))?;
        tags_synced += exec as usize;
    }

    // 4. 推送 Links
    let local_links = Links::find()
        .filter(links::Column::UpdatedAt.gt(last_pushed_at))
        .all(local_db)
        .await
        .map_err(|e| format!("读取本地 Links 失败: {}", e))?;
    let links_total = local_links.len();

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
    let tasks_total = local_tasks.len();

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

    // 6. 推送 TaskActivityLogs（日志表 append-only，按 created_at 增量同步）
    let local_activity_logs = TaskActivityLogs::find()
        .filter(task_activity_logs::Column::CreatedAt.gt(last_pushed_at))
        .all(local_db)
        .await
        .map_err(|e| format!("读取本地 TaskActivityLogs 失败: {}", e))?;
    let task_activity_logs_total = local_activity_logs.len();
    let mut task_activity_logs_synced = 0usize;

    for m in local_activity_logs {
        let am: task_activity_logs::ActiveModel = m.into();
        let exec = task_activity_logs::Entity::insert(am)
            .on_conflict(
                OnConflict::column(task_activity_logs::Column::Id)
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(&remote_db)
            .await
            .map_err(|e| format!("推送 TaskActivityLog 到远程失败: {}", e))?;
        task_activity_logs_synced += exec as usize;
    }

    // 7. 推送关联表（关联表没有更新时间字段，采用全量推送 + 主键去重写入）
    let local_task_tags = TaskTags::find()
        .all(local_db)
        .await
        .map_err(|e| format!("读取本地 TaskTags 失败: {}", e))?;
    let task_tags_total = local_task_tags.len();
    let mut task_tags_synced = 0usize;
    for m in local_task_tags {
        let am: task_tags::ActiveModel = m.into();
        let exec = task_tags::Entity::insert(am)
            .on_conflict(
                OnConflict::columns([task_tags::Column::TaskId, task_tags::Column::TagId])
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(&remote_db)
            .await
            .map_err(|e| format!("推送 TaskTag 到远程失败: {}", e))?;
        task_tags_synced += exec as usize;
    }

    let local_task_links = TaskLinks::find()
        .all(local_db)
        .await
        .map_err(|e| format!("读取本地 TaskLinks 失败: {}", e))?;
    let task_links_total = local_task_links.len();
    let mut task_links_synced = 0usize;
    for m in local_task_links {
        let am: task_links::ActiveModel = m.into();
        let exec = task_links::Entity::insert(am)
            .on_conflict(
                OnConflict::columns([task_links::Column::TaskId, task_links::Column::LinkId])
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(&remote_db)
            .await
            .map_err(|e| format!("推送 TaskLink 到远程失败: {}", e))?;
        task_links_synced += exec as usize;
    }

    let local_project_tags = ProjectTags::find()
        .all(local_db)
        .await
        .map_err(|e| format!("读取本地 ProjectTags 失败: {}", e))?;
    let project_tags_total = local_project_tags.len();
    let mut project_tags_synced = 0usize;
    for m in local_project_tags {
        let am: project_tags::ActiveModel = m.into();
        let exec = project_tags::Entity::insert(am)
            .on_conflict(
                OnConflict::columns([project_tags::Column::ProjectId, project_tags::Column::TagId])
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(&remote_db)
            .await
            .map_err(|e| format!("推送 ProjectTag 到远程失败: {}", e))?;
        project_tags_synced += exec as usize;
    }

    let local_project_links = ProjectLinks::find()
        .all(local_db)
        .await
        .map_err(|e| format!("读取本地 ProjectLinks 失败: {}", e))?;
    let project_links_total = local_project_links.len();
    let mut project_links_synced = 0usize;
    for m in local_project_links {
        let am: project_links::ActiveModel = m.into();
        let exec = project_links::Entity::insert(am)
            .on_conflict(
                OnConflict::columns([
                    project_links::Column::ProjectId,
                    project_links::Column::LinkId,
                ])
                .do_nothing()
                .to_owned(),
            )
            .exec_without_returning(&remote_db)
            .await
            .map_err(|e| format!("推送 ProjectLink 到远程失败: {}", e))?;
        project_links_synced += exec as usize;
    }

    // 重点：最后更新本地 last_pushed_at，避免“部分成功导致水位错位”。
    // 更新时间戳
    update_sync_time(local_db, KEY_LAST_PUSHED_AT, current_sync_start)
        .await
        .map_err(|e| format!("更新 last_pushed_at 失败: {}", e))?;

    Ok(SyncCommandReport {
        synced_at: current_sync_start,
        tables: SyncTablesReport {
            spaces: SyncTableReport::upsert(spaces_total, spaces_total),
            projects: SyncTableReport::upsert(projects_total, projects_total),
            tags: SyncTableReport::dedup(tags_total, tags_synced),
            links: SyncTableReport::upsert(links_total, links_total),
            tasks: SyncTableReport::upsert(tasks_total, tasks_total),
            task_activity_logs: SyncTableReport::dedup(
                task_activity_logs_total,
                task_activity_logs_synced,
            ),
            task_tags: SyncTableReport::dedup(task_tags_total, task_tags_synced),
            task_links: SyncTableReport::dedup(task_links_total, task_links_synced),
            project_tags: SyncTableReport::dedup(project_tags_total, project_tags_synced),
            project_links: SyncTableReport::dedup(project_links_total, project_links_synced),
        },
    })
}

/// -------------------------------------------------------------------------
/// Command: Test Neon Connection
/// -------------------------------------------------------------------------
#[tauri::command(rename_all = "camelCase")]
pub async fn test_neon_connection(args: DatabaseUrlArgs) -> Result<(), String> {
    let _ = get_remote_db(&args.database_url).await?;
    Ok(())
}
