//! 通用链接仓储（Task/Project 共用）。
//!
//! 重点：
//! - Link 主表 + junction 表的两层结构
//! - 同步流程改为 tombstone 集合同步，保证关系删除能传播

use std::collections::{HashMap, HashSet};

use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QuerySelect, RelationTrait, Set,
};
use uuid::Uuid;

use crate::db::entities::{links, project_links, sea_orm_active_enums::LinkKind, task_links};
use crate::db::now_ms;
use crate::types::{
    dto::{LinkDto, LinkInputDto},
    error::AppError,
};

pub enum LinkEntity {
    Task,
    Project,
}

struct LinkRelationState {
    link_id: String,
    deleted_at: Option<i64>,
}

struct NormalizedLinkInput {
    id: Option<String>,
    title: String,
    url: String,
    kind: String,
    rank: i64,
}

pub async fn load_links(
    conn: &DatabaseConnection,
    entity: LinkEntity,
    owner_ids: &[String],
) -> Result<HashMap<String, Vec<LinkDto>>, AppError> {
    if owner_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows: Vec<(String, links::Model)> = match entity {
        LinkEntity::Task => task_links::Entity::find()
            .join(sea_orm::JoinType::InnerJoin, task_links::Relation::Links.def())
            .select_also(links::Entity)
            .filter(task_links::Column::TaskId.is_in(owner_ids.iter().cloned()))
            .filter(task_links::Column::DeletedAt.is_null())
            .all(conn)
            .await
            .map_err(AppError::from)?
            .into_iter()
            .filter_map(|(tl, link)| link.map(|l| (tl.task_id, l)))
            .collect(),
        LinkEntity::Project => project_links::Entity::find()
            .join(
                sea_orm::JoinType::InnerJoin,
                project_links::Relation::Links.def(),
            )
            .select_also(links::Entity)
            .filter(project_links::Column::ProjectId.is_in(owner_ids.iter().cloned()))
            .filter(project_links::Column::DeletedAt.is_null())
            .all(conn)
            .await
            .map_err(AppError::from)?
            .into_iter()
            .filter_map(|(pl, link)| link.map(|l| (pl.project_id, l)))
            .collect(),
    };

    let mut map: HashMap<String, Vec<LinkDto>> = HashMap::new();
    for (owner_id, l) in rows {
        let dto = LinkDto {
            id: l.id,
            title: l.title,
            url: l.url,
            kind: match l.kind {
                LinkKind::Doc => "doc".to_string(),
                LinkKind::RepoLocal => "repoLocal".to_string(),
                LinkKind::RepoRemote => "repoRemote".to_string(),
                LinkKind::Web => "web".to_string(),
                LinkKind::Design => "design".to_string(),
                LinkKind::Other => "other".to_string(),
            },
            rank: l.rank,
            created_at: l.created_at,
            updated_at: l.updated_at,
        };
        map.entry(owner_id).or_default().push(dto);
    }

    for list in map.values_mut() {
        list.sort_by(|a, b| {
            a.rank
                .cmp(&b.rank)
                .then_with(|| a.created_at.cmp(&b.created_at))
        });
    }

    Ok(map)
}

pub async fn sync_links<C>(
    conn: &C,
    entity: LinkEntity,
    owner_id: &str,
    links: &[LinkInputDto],
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    let now = now_ms();
    let normalized = normalize_link_inputs(links)?;
    let existing_relations = load_existing_relations(conn, &entity, owner_id).await?;
    let mut desired_link_ids = HashSet::new();

    for link_input in normalized {
        let link_id = if let Some(id) = &link_input.id {
            let kind_enum = parse_kind(&link_input.kind)?;
            let update_res = links::ActiveModel {
                id: Set(id.clone()),
                title: Set(link_input.title.clone()),
                url: Set(link_input.url.clone()),
                kind: Set(kind_enum),
                rank: Set(link_input.rank),
                updated_at: Set(now),
                ..Default::default()
            }
            .update(conn)
            .await;

            match update_res {
                Ok(_) => id.clone(),
                Err(sea_orm::DbErr::RecordNotFound(_)) => {
                    create_new_link(conn, id, &link_input, now).await?
                }
                Err(e) => return Err(AppError::from(e)),
            }
        } else {
            let id = Uuid::new_v4().to_string();
            create_new_link(conn, &id, &link_input, now).await?
        };

        desired_link_ids.insert(link_id.clone());
        match existing_relations
            .iter()
            .find(|relation| relation.link_id == link_id)
        {
            Some(relation) if relation.deleted_at.is_some() => {
                apply_link_relation_state(conn, &entity, owner_id, &link_id, now, None).await?;
            }
            Some(_) => {}
            None => {
                insert_link_relation(conn, &entity, owner_id, &link_id, now).await?;
            }
        }
    }

    for relation in existing_relations.iter().filter(|relation| relation.deleted_at.is_none()) {
        if !desired_link_ids.contains(&relation.link_id) {
            apply_link_relation_state(conn, &entity, owner_id, &relation.link_id, now, Some(now)).await?;
        }
    }

    Ok(())
}

async fn create_new_link<C>(
    conn: &C,
    id: &str,
    input: &NormalizedLinkInput,
    now: i64,
) -> Result<String, AppError>
where
    C: ConnectionTrait,
{
    let kind_enum = parse_kind(&input.kind)?;
    links::ActiveModel {
        id: Set(id.to_string()),
        title: Set(input.title.clone()),
        url: Set(input.url.clone()),
        kind: Set(kind_enum),
        rank: Set(input.rank),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(conn)
    .await
    .map_err(AppError::from)?;
    Ok(id.to_string())
}

async fn load_existing_relations<C>(
    conn: &C,
    entity: &LinkEntity,
    owner_id: &str,
) -> Result<Vec<LinkRelationState>, AppError>
where
    C: ConnectionTrait,
{
    match entity {
        LinkEntity::Task => task_links::Entity::find()
            .select_only()
            .column(task_links::Column::LinkId)
            .column(task_links::Column::DeletedAt)
            .filter(task_links::Column::TaskId.eq(owner_id))
            .into_tuple::<(String, Option<i64>)>()
            .all(conn)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|(link_id, deleted_at)| LinkRelationState {
                        link_id,
                        deleted_at,
                    })
                    .collect()
            })
            .map_err(AppError::from),
        LinkEntity::Project => project_links::Entity::find()
            .select_only()
            .column(project_links::Column::LinkId)
            .column(project_links::Column::DeletedAt)
            .filter(project_links::Column::ProjectId.eq(owner_id))
            .into_tuple::<(String, Option<i64>)>()
            .all(conn)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|(link_id, deleted_at)| LinkRelationState {
                        link_id,
                        deleted_at,
                    })
                    .collect()
            })
            .map_err(AppError::from),
    }
}

async fn insert_link_relation<C>(
    conn: &C,
    entity: &LinkEntity,
    owner_id: &str,
    link_id: &str,
    now: i64,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    match entity {
        LinkEntity::Task => {
            task_links::ActiveModel {
                task_id: Set(owner_id.to_string()),
                link_id: Set(link_id.to_string()),
                updated_at: Set(now),
                deleted_at: Set(None),
            }
            .insert(conn)
            .await
            .map_err(AppError::from)?;
        }
        LinkEntity::Project => {
            project_links::ActiveModel {
                project_id: Set(owner_id.to_string()),
                link_id: Set(link_id.to_string()),
                updated_at: Set(now),
                deleted_at: Set(None),
            }
            .insert(conn)
            .await
            .map_err(AppError::from)?;
        }
    }

    Ok(())
}

async fn apply_link_relation_state<C>(
    conn: &C,
    entity: &LinkEntity,
    owner_id: &str,
    link_id: &str,
    updated_at: i64,
    deleted_at: Option<i64>,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    match entity {
        LinkEntity::Task => {
            task_links::ActiveModel {
                task_id: Set(owner_id.to_string()),
                link_id: Set(link_id.to_string()),
                updated_at: Set(updated_at),
                deleted_at: Set(deleted_at),
            }
            .update(conn)
            .await
            .map_err(AppError::from)?;
        }
        LinkEntity::Project => {
            project_links::ActiveModel {
                project_id: Set(owner_id.to_string()),
                link_id: Set(link_id.to_string()),
                updated_at: Set(updated_at),
                deleted_at: Set(deleted_at),
            }
            .update(conn)
            .await
            .map_err(AppError::from)?;
        }
    }

    Ok(())
}

fn parse_kind(k: &str) -> Result<LinkKind, AppError> {
    match k {
        "doc" => Ok(LinkKind::Doc),
        "repoLocal" => Ok(LinkKind::RepoLocal),
        "repoRemote" => Ok(LinkKind::RepoRemote),
        "web" => Ok(LinkKind::Web),
        "design" => Ok(LinkKind::Design),
        "other" => Ok(LinkKind::Other),
        _ => Err(AppError::Validation("links.kind 不合法".to_string())),
    }
}

fn normalize_link_inputs(links: &[LinkInputDto]) -> Result<Vec<NormalizedLinkInput>, AppError> {
    let mut normalized = Vec::new();

    for link in links {
        let title = link.title.trim();
        let url = link.url.trim();
        if url.is_empty() {
            return Err(AppError::Validation("links.url 不能为空".to_string()));
        }
        let kind = link.kind.trim();
        if !matches!(
            kind,
            "doc" | "repoLocal" | "repoRemote" | "web" | "design" | "other"
        ) {
            return Err(AppError::Validation("links.kind 不合法".to_string()));
        }
        let resolved_title = if title.is_empty() { url } else { title };
        let rank = link.rank.unwrap_or(1024);
        normalized.push(NormalizedLinkInput {
            id: link.id.clone(),
            title: resolved_title.to_string(),
            url: url.to_string(),
            kind: kind.to_string(),
            rank,
        });
    }

    Ok(normalized)
}

