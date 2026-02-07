use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};
use uuid::Uuid;

use crate::db::entities::{projects, sea_orm_active_enums::Priority};
use crate::db::now_ms;
use crate::repos::{
    common_task_utils,
    link_repo::{self, LinkEntity},
    tag_repo::{self, TagEntity},
};
use crate::types::{
    dto::{LinkInputDto, ProjectDto},
    error::AppError,
};

pub mod helpers;

pub struct ProjectRepo;

#[derive(Debug, Clone)]
pub struct ProjectCreateInput {
    pub space_id: String,
    pub title: String,
    pub parent_id: Option<String>,
    pub note: Option<String>,
    pub priority: Option<String>,
    pub rank: Option<i64>,
    pub tags: Option<Vec<String>>,
    pub links: Option<Vec<LinkInputDto>>,
}

impl ProjectRepo {
    /// 列出某个 Space 下的所有 Project，按 rank ASC → created_at ASC 排序。
    pub async fn list_by_space(
        conn: &DatabaseConnection,
        space_id: &str,
    ) -> Result<Vec<ProjectDto>, AppError> {
        let models = projects::Entity::find()
            .filter(projects::Column::SpaceId.eq(space_id))
            .filter(projects::Column::DeletedAt.is_null())
            .order_by_asc(projects::Column::Rank)
            .order_by_asc(projects::Column::CreatedAt)
            .all(conn)
            .await
            .map_err(AppError::from)?;

        let mut dtos = Vec::with_capacity(models.len());
        for m in models {
            dtos.push(model_to_dto(m));
        }

        helpers::attach_links(conn, &mut dtos).await?;
        helpers::attach_tags(conn, &mut dtos).await?;

        Ok(dtos)
    }

    /// 列出某个 Space 下的已软删除 Project。
    pub async fn list_deleted_by_space(
        conn: &DatabaseConnection,
        space_id: &str,
    ) -> Result<Vec<ProjectDto>, AppError> {
        let models = projects::Entity::find()
            .filter(projects::Column::SpaceId.eq(space_id))
            .filter(projects::Column::DeletedAt.is_not_null())
            .order_by_desc(projects::Column::DeletedAt)
            .order_by_desc(projects::Column::CreatedAt)
            .all(conn)
            .await
            .map_err(AppError::from)?;

        let mut dtos = Vec::with_capacity(models.len());
        for m in models {
            dtos.push(model_to_dto(m));
        }

        helpers::attach_links(conn, &mut dtos).await?;
        helpers::attach_tags(conn, &mut dtos).await?;

        Ok(dtos)
    }

    /// 获取默认 Project（每个 Space 都有一个名为 "{SpaceName} · Default" 的默认项目）。
    pub async fn get_default_project(
        conn: &DatabaseConnection,
        space_id: &str,
    ) -> Result<ProjectDto, AppError> {
        let default_id = format!("{space_id}_default");

        let model = projects::Entity::find_by_id(&default_id)
            .one(conn)
            .await
            .map_err(AppError::from)?;

        match model {
            Some(m) => {
                let mut dto = model_to_dto(m);
                helpers::attach_links(conn, std::slice::from_mut(&mut dto)).await?;
                helpers::attach_tags(conn, std::slice::from_mut(&mut dto)).await?;
                Ok(dto)
            }
            None => Err(AppError::Validation(format!(
                "Default project for space '{}' not found. Please ensure database is properly initialized.",
                space_id
            ))),
        }
    }

    /// 创建新项目。
    pub async fn create(
        conn: &DatabaseConnection,
        input: ProjectCreateInput,
    ) -> Result<ProjectDto, AppError> {
        let ProjectCreateInput {
            space_id,
            title,
            parent_id,
            note,
            priority,
            rank,
            tags,
            links,
        } = input;

        let title = title.trim();
        if title.is_empty() {
            return Err(AppError::Validation("项目名称不能为空".to_string()));
        }
        let note = note.as_deref().and_then(|v| {
            let trimmed = v.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        });
        let tags = tags.unwrap_or_default();
        let links = links.unwrap_or_default();

        let priority_enum = common_task_utils::parse_priority(priority.as_deref())?;

        let path =
            helpers::build_project_path(conn, &space_id, parent_id.as_deref(), title).await?;

        let now = now_ms();
        let id = Uuid::new_v4().to_string();

        let mut rank_query = projects::Entity::find()
            .filter(projects::Column::SpaceId.eq(space_id.clone()))
            .filter(projects::Column::DeletedAt.is_null());
        if let Some(pid) = parent_id.as_deref() {
            rank_query = rank_query.filter(projects::Column::ParentId.eq(pid));
        } else {
            rank_query = rank_query.filter(projects::Column::ParentId.is_null());
        }

        let max_rank_project = rank_query
            .order_by_desc(projects::Column::Rank)
            .one(conn)
            .await
            .map_err(AppError::from)?;

        let default_rank = max_rank_project.map(|p| p.rank + 1024).unwrap_or(1024);
        let resolved_rank = rank.unwrap_or(default_rank);

        let active_model = projects::ActiveModel {
            id: Set(id.clone()),
            space_id: Set(space_id),
            parent_id: Set(parent_id),
            path: Set(path.clone()),
            title: Set(title.to_string()),
            note: Set(note),
            priority: Set(priority_enum),
            todo_task_count: Set(0),
            done_task_count: Set(0),
            last_task_updated_at: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
            archived_at: Set(None),
            deleted_at: Set(None),
            create_by: Set("stonefish".to_string()),
            rank: Set(resolved_rank),
        };

        let txn = conn.begin().await.map_err(AppError::from)?;
        let res = active_model.insert(&txn).await.map_err(AppError::from)?;

        if !tags.is_empty() {
            tag_repo::sync_tags(&txn, TagEntity::Project, &id, &tags, now).await?;
        }
        if !links.is_empty() {
            link_repo::sync_links(&txn, LinkEntity::Project, &id, &links).await?;
        }

        txn.commit().await.map_err(AppError::from)?;

        let mut dto = model_to_dto(res);
        helpers::attach_links(conn, std::slice::from_mut(&mut dto)).await?;
        helpers::attach_tags(conn, std::slice::from_mut(&mut dto)).await?;
        Ok(dto)
    }

    /// 更新项目的 rank 和可选的 parentId（用于拖拽排序）。
    pub async fn reorder(
        conn: &DatabaseConnection,
        project_id: &str,
        new_rank: i64,
        new_parent_id: Option<Option<&str>>,
    ) -> Result<(), AppError> {
        let model = projects::Entity::find_by_id(project_id)
            .one(conn)
            .await
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::Validation(format!("项目 {} 不存在", project_id)))?;

        let now = now_ms();

        let mut active_model: projects::ActiveModel = model.into();
        active_model.rank = Set(new_rank);
        active_model.updated_at = Set(now);

        // 如果需要更新 parentId
        if let Some(parent_opt) = new_parent_id {
            active_model.parent_id = Set(parent_opt.map(|s| s.to_string()));
            // TODO: 更新 path（需要重新计算）
        }

        active_model.update(conn).await.map_err(AppError::from)?;
        Ok(())
    }

    /// 批量重排项目 rank。
    pub async fn rebalance_ranks(
        conn: &DatabaseConnection,
        project_ids: &[String],
        step: i64,
    ) -> Result<(), AppError> {
        let now = now_ms();
        for (index, project_id) in project_ids.iter().enumerate() {
            let new_rank = (index as i64) * step;
            let model = projects::Entity::find_by_id(project_id)
                .one(conn)
                .await
                .map_err(AppError::from)?;

            if let Some(m) = model {
                let mut active_model: projects::ActiveModel = m.into();
                active_model.rank = Set(new_rank);
                active_model.updated_at = Set(now);
                active_model.update(conn).await.map_err(AppError::from)?;
            }
        }
        Ok(())
    }

    /// 软删除项目。
    pub async fn soft_delete(conn: &DatabaseConnection, project_id: &str) -> Result<(), AppError> {
        let model = projects::Entity::find_by_id(project_id)
            .one(conn)
            .await
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::Validation(format!("项目 {} 不存在", project_id)))?;

        let now = now_ms();
        let mut active_model: projects::ActiveModel = model.into();
        active_model.deleted_at = Set(Some(now));
        active_model.updated_at = Set(now);
        active_model.update(conn).await.map_err(AppError::from)?;
        Ok(())
    }

    /// 恢复软删除项目。
    pub async fn restore(conn: &DatabaseConnection, project_id: &str) -> Result<(), AppError> {
        let model = projects::Entity::find_by_id(project_id)
            .one(conn)
            .await
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::Validation(format!("项目 {} 不存在", project_id)))?;

        let now = now_ms();
        let mut active_model: projects::ActiveModel = model.into();
        active_model.deleted_at = Set(None);
        active_model.updated_at = Set(now);
        active_model.update(conn).await.map_err(AppError::from)?;
        Ok(())
    }
}

fn model_to_dto(m: projects::Model) -> ProjectDto {
    let computed_status = helpers::compute_status(
        m.deleted_at,
        m.archived_at,
        m.todo_task_count,
        m.done_task_count,
    );

    let priority_string = match m.priority {
        Priority::P0 => "P0",
        Priority::P1 => "P1",
        Priority::P2 => "P2",
        Priority::P3 => "P3",
    }
    .to_string();

    ProjectDto {
        id: m.id,
        space_id: m.space_id,
        parent_id: m.parent_id,
        path: m.path,
        title: m.title,
        note: m.note,
        priority: priority_string,
        todo_task_count: m.todo_task_count,
        done_task_count: m.done_task_count,
        last_task_updated_at: m.last_task_updated_at,
        created_at: m.created_at,
        updated_at: m.updated_at,
        archived_at: m.archived_at,
        deleted_at: m.deleted_at,
        create_by: m.create_by,
        rank: m.rank,
        computed_status,
        tags: Vec::new(),
        links: Vec::new(),
    }
}
