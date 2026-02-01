use std::collections::{HashMap, HashSet};

use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, QuerySelect, RelationTrait, Set, Statement,
};
use uuid::Uuid;

use crate::db::entities::{project_tags, tags, task_tags};
use crate::types::error::AppError;

pub enum TagEntity {
    Task,
    Project,
}

impl TagEntity {
    fn table(&self) -> &'static str {
        match self {
            TagEntity::Task => "task_tags",
            TagEntity::Project => "project_tags",
        }
    }

    fn owner_column(&self) -> &'static str {
        match self {
            TagEntity::Task => "task_id",
            TagEntity::Project => "project_id",
        }
    }
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
            .join(
                sea_orm::JoinType::InnerJoin,
                task_tags::Relation::Tags.def(),
            )
            .filter(task_tags::Column::TaskId.is_in(owner_ids.iter().cloned()))
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
            .join(
                sea_orm::JoinType::InnerJoin,
                project_tags::Relation::Tags.def(),
            )
            .filter(project_tags::Column::ProjectId.is_in(owner_ids.iter().cloned()))
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
    let normalized = normalize_tag_names(names);

    // 1. 删除现有的关联记录
    let sql = format!(
        "DELETE FROM {} WHERE {} = $1",
        entity.table(),
        entity.owner_column()
    );
    conn.execute(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Sqlite,
        &sql,
        [owner_id.into()],
    ))
    .await
    .map_err(AppError::from)?;

    // 2. 插入新标签和关联
    for name in normalized {
        let tag_id = ensure_tag(conn, &name, created_at).await?;

        // 通用插入
        match entity {
            TagEntity::Task => {
                task_tags::ActiveModel {
                    task_id: Set(owner_id.to_string()),
                    tag_id: Set(tag_id),
                }
                .insert(conn)
                .await
                .ok();
            }
            TagEntity::Project => {
                project_tags::ActiveModel {
                    project_id: Set(owner_id.to_string()),
                    tag_id: Set(tag_id),
                }
                .insert(conn)
                .await
                .ok();
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

async fn ensure_tag<C>(conn: &C, name: &str, created_at: i64) -> Result<String, AppError>
where
    C: ConnectionTrait,
{
    // 检查是否存在
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
