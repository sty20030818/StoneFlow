//! 通用标签仓储（可用于 Task 和 Project）。
//!
//! 重点：
//! - `TagEntity` 把“业务实体差异”抽象为表名与 owner 列名
//! - 同步策略改为 tombstone 集合同步，保证关系删除能传播到远端

use std::collections::{HashMap, HashSet};

use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, QuerySelect, RelationTrait, Set,
};
use uuid::Uuid;

use crate::db::entities::{project_tags, tags, task_tags};
use crate::types::error::AppError;

pub enum TagEntity {
    Task,
    Project,
}

pub struct TagRelationState {
    pub tag_id: String,
    pub deleted_at: Option<i64>,
}

pub async fn load_tags(
    conn: &DatabaseConnection,
    entity: TagEntity,
    owner_ids: &[String],
) -> Result<HashMap<String, Vec<String>>, AppError> {
    if owner_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows: Vec<(String, String)> = match entity {
        TagEntity::Task => task_tags::Entity::find()
            .select_only()
            .column(task_tags::Column::TaskId)
            .column(tags::Column::Name)
            .join(sea_orm::JoinType::InnerJoin, task_tags::Relation::Tags.def())
            .filter(task_tags::Column::TaskId.is_in(owner_ids.iter().cloned()))
            .filter(task_tags::Column::DeletedAt.is_null())
            .order_by_asc(tags::Column::Name)
            .order_by_asc(tags::Column::CreatedAt)
            .into_tuple()
            .all(conn)
            .await
            .map_err(AppError::from)?,
        TagEntity::Project => project_tags::Entity::find()
            .select_only()
            .column(project_tags::Column::ProjectId)
            .column(tags::Column::Name)
            .join(sea_orm::JoinType::InnerJoin, project_tags::Relation::Tags.def())
            .filter(project_tags::Column::ProjectId.is_in(owner_ids.iter().cloned()))
            .filter(project_tags::Column::DeletedAt.is_null())
            .order_by_asc(tags::Column::Name)
            .order_by_asc(tags::Column::CreatedAt)
            .into_tuple()
            .all(conn)
            .await
            .map_err(AppError::from)?,
    };

    let mut map: HashMap<String, Vec<String>> = HashMap::new();
    for (owner_id, name) in rows {
        map.entry(owner_id).or_default().push(name);
    }

    Ok(map)
}

pub async fn sync_tags<C>(
    conn: &C,
    entity: TagEntity,
    owner_id: &str,
    names: &[String],
    created_at: i64,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    let desired_names = normalize_tag_names(names);
    let desired_tag_ids = ensure_tags(conn, &desired_names, created_at).await?;
    let desired_tag_id_set: HashSet<String> = desired_tag_ids.iter().cloned().collect();
    let existing_relations = load_existing_relations(conn, &entity, owner_id).await?;

    for relation in existing_relations.iter().filter(|relation| relation.deleted_at.is_none()) {
        if !desired_tag_id_set.contains(&relation.tag_id) {
            apply_tag_relation_state(conn, &entity, owner_id, &relation.tag_id, created_at, Some(created_at)).await?;
        }
    }

    for tag_id in desired_tag_ids {
        match existing_relations.iter().find(|relation| relation.tag_id == tag_id) {
            Some(relation) if relation.deleted_at.is_some() => {
                apply_tag_relation_state(conn, &entity, owner_id, &tag_id, created_at, None).await?;
            }
            Some(_) => {}
            None => {
                insert_tag_relation(conn, &entity, owner_id, &tag_id, created_at).await?;
            }
        }
    }

    Ok(())
}

fn normalize_tag_names(tags: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    tags.iter()
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .filter(|t| seen.insert(t.clone()))
        .collect()
}

async fn ensure_tags<C>(
    conn: &C,
    names: &[String],
    created_at: i64,
) -> Result<Vec<String>, AppError>
where
    C: ConnectionTrait,
{
    let mut tag_ids = Vec::with_capacity(names.len());
    for name in names {
        tag_ids.push(ensure_tag(conn, name, created_at).await?);
    }
    Ok(tag_ids)
}

async fn ensure_tag<C>(conn: &C, name: &str, created_at: i64) -> Result<String, AppError>
where
    C: ConnectionTrait,
{
    let existing = tags::Entity::find()
        .filter(tags::Column::Name.eq(name))
        .one(conn)
        .await
        .map_err(AppError::from)?;

    if let Some(tag) = existing {
        Ok(tag.id)
    } else {
        let id = Uuid::new_v4().to_string();
        let new_tag = tags::ActiveModel {
            id: Set(id.clone()),
            name: Set(name.to_string()),
            created_at: Set(created_at),
        };
        new_tag.insert(conn).await.map_err(AppError::from)?;
        Ok(id)
    }
}

async fn load_existing_relations<C>(
    conn: &C,
    entity: &TagEntity,
    owner_id: &str,
) -> Result<Vec<TagRelationState>, AppError>
where
    C: ConnectionTrait,
{
    match entity {
        TagEntity::Task => task_tags::Entity::find()
            .select_only()
            .column(task_tags::Column::TagId)
            .column(task_tags::Column::DeletedAt)
            .filter(task_tags::Column::TaskId.eq(owner_id))
            .into_tuple::<(String, Option<i64>)>()
            .all(conn)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|(tag_id, deleted_at)| TagRelationState { tag_id, deleted_at })
                    .collect()
            })
            .map_err(AppError::from),
        TagEntity::Project => project_tags::Entity::find()
            .select_only()
            .column(project_tags::Column::TagId)
            .column(project_tags::Column::DeletedAt)
            .filter(project_tags::Column::ProjectId.eq(owner_id))
            .into_tuple::<(String, Option<i64>)>()
            .all(conn)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|(tag_id, deleted_at)| TagRelationState { tag_id, deleted_at })
                    .collect()
            })
            .map_err(AppError::from),
    }
}

async fn insert_tag_relation<C>(
    conn: &C,
    entity: &TagEntity,
    owner_id: &str,
    tag_id: &str,
    now: i64,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    match entity {
        TagEntity::Task => {
            task_tags::ActiveModel {
                task_id: Set(owner_id.to_string()),
                tag_id: Set(tag_id.to_string()),
                updated_at: Set(now),
                deleted_at: Set(None),
            }
            .insert(conn)
            .await
            .map_err(AppError::from)?;
        }
        TagEntity::Project => {
            project_tags::ActiveModel {
                project_id: Set(owner_id.to_string()),
                tag_id: Set(tag_id.to_string()),
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

async fn apply_tag_relation_state<C>(
    conn: &C,
    entity: &TagEntity,
    owner_id: &str,
    tag_id: &str,
    updated_at: i64,
    deleted_at: Option<i64>,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    match entity {
        TagEntity::Task => {
            task_tags::ActiveModel {
                task_id: Set(owner_id.to_string()),
                tag_id: Set(tag_id.to_string()),
                updated_at: Set(updated_at),
                deleted_at: Set(deleted_at),
            }
            .update(conn)
            .await
            .map_err(AppError::from)?;
        }
        TagEntity::Project => {
            project_tags::ActiveModel {
                project_id: Set(owner_id.to_string()),
                tag_id: Set(tag_id.to_string()),
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

