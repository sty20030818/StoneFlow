//! Task 主表查询原语。
//!
//! 这里集中放置可被 service 组合的任务读取能力，
//! 不承载事务编排与业务副作用判断。

use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect,
    RelationTrait,
};

use crate::db::entities::{
    links as link_entities,
    sea_orm_active_enums::{LinkKind, Priority, TaskStatus},
    tags as tag_entities, task_links, task_tags, tasks,
};
use crate::types::error::AppError;

pub async fn find_by_id<C>(conn: &C, id: &str) -> Result<tasks::Model, AppError>
where
    C: ConnectionTrait,
{
    // 查询原语只负责“找到或报不存在”，不在这里追加业务副作用。
    tasks::Entity::find_by_id(id)
        .one(conn)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError::Validation("任务不存在".to_string()))
}

pub async fn find_not_deleted_by_ids<C>(
    conn: &C,
    ids: &[String],
) -> Result<Vec<tasks::Model>, AppError>
where
    C: ConnectionTrait,
{
    // 供批量删除/恢复等用例复用，只返回未软删除任务。
    tasks::Entity::find()
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .filter(tasks::Column::DeletedAt.is_null())
        .all(conn)
        .await
        .map_err(AppError::from)
}

pub async fn find_deleted_by_ids<C>(conn: &C, ids: &[String]) -> Result<Vec<tasks::Model>, AppError>
where
    C: ConnectionTrait,
{
    // 和 `find_not_deleted_by_ids` 对称，供恢复流程使用。
    tasks::Entity::find()
        .filter(tasks::Column::Id.is_in(ids.iter().cloned()))
        .filter(tasks::Column::DeletedAt.is_not_null())
        .all(conn)
        .await
        .map_err(AppError::from)
}

pub async fn next_rank_in_bucket<C>(
    conn: &C,
    space_id: &str,
    status: &TaskStatus,
    priority: &Priority,
) -> Result<i64, AppError>
where
    C: ConnectionTrait,
{
    // rank 采用稀疏分布，默认每次尾插时加 1024，便于后续在中间插入。
    let max_rank_task = tasks::Entity::find()
        .filter(tasks::Column::SpaceId.eq(space_id))
        .filter(tasks::Column::Status.eq(status.clone()))
        .filter(tasks::Column::Priority.eq(priority.clone()))
        .filter(tasks::Column::DeletedAt.is_null())
        .order_by_desc(tasks::Column::Rank)
        .one(conn)
        .await
        .map_err(AppError::from)?;

    Ok(max_rank_task.map(|task| task.rank + 1024).unwrap_or(1024))
}

pub async fn load_task_tags_for_log<C>(conn: &C, task_id: &str) -> Result<Vec<String>, AppError>
where
    C: ConnectionTrait,
{
    // 日志显示希望拿到稳定顺序的标签名，因此在查询层就排好序。
    task_tags::Entity::find()
        .select_only()
        .column(tag_entities::Column::Name)
        .join(JoinType::InnerJoin, task_tags::Relation::Tags.def())
        .filter(task_tags::Column::TaskId.eq(task_id))
        .order_by_asc(tag_entities::Column::Name)
        .order_by_asc(tag_entities::Column::CreatedAt)
        .into_tuple()
        .all(conn)
        .await
        .map_err(AppError::from)
}

pub async fn load_task_links_for_log<C>(conn: &C, task_id: &str) -> Result<Vec<String>, AppError>
where
    C: ConnectionTrait,
{
    // 链接日志既要读标题和 URL，也要按 rank 稳定排序，方便前后值比较。
    let rows: Vec<(String, String, LinkKind, i64, i64)> = task_links::Entity::find()
        .select_only()
        .column(link_entities::Column::Title)
        .column(link_entities::Column::Url)
        .column(link_entities::Column::Kind)
        .column(link_entities::Column::Rank)
        .column(link_entities::Column::CreatedAt)
        .join(JoinType::InnerJoin, task_links::Relation::Links.def())
        .filter(task_links::Column::TaskId.eq(task_id))
        .order_by_asc(link_entities::Column::Rank)
        .order_by_asc(link_entities::Column::CreatedAt)
        .into_tuple()
        .all(conn)
        .await
        .map_err(AppError::from)?;

    Ok(rows
        .into_iter()
        .map(|(title, url, kind, _rank, _created_at)| {
            format_link_for_log(link_kind_to_value(&kind), &title, &url)
        })
        .collect())
}

/// 把链接 kind 枚举转成前端和日志都能复用的字符串。
fn link_kind_to_value(kind: &LinkKind) -> &'static str {
    match kind {
        LinkKind::Doc => "doc",
        LinkKind::RepoLocal => "repoLocal",
        LinkKind::RepoRemote => "repoRemote",
        LinkKind::Web => "web",
        LinkKind::Design => "design",
        LinkKind::Other => "other",
    }
}

/// 统一活动日志里的链接文本格式，避免不同入口拼接方式不一致。
fn format_link_for_log(kind: &str, title: &str, url: &str) -> String {
    format!("{}:{}<{}>", kind, title.trim(), url.trim())
}
