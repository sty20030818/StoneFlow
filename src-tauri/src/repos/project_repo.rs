use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
};
use uuid::Uuid;

use crate::db::entities::{projects, sea_orm_active_enums::Priority};
use crate::db::now_ms;
use crate::repos::common_task_utils;
use crate::types::{dto::ProjectDto, error::AppError};

pub mod helpers;

pub struct ProjectRepo;

impl ProjectRepo {
    /// 列出某个 Space 下的所有 Project，按 path 排序（用于构建树 & Project Tree）。
    pub async fn list_by_space(
        conn: &DatabaseConnection,
        space_id: &str,
    ) -> Result<Vec<ProjectDto>, AppError> {
        let models = projects::Entity::find()
            .filter(projects::Column::SpaceId.eq(space_id))
            .order_by_asc(projects::Column::Path)
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
        space_id: &str,
        title: &str,
        parent_id: Option<&str>,
        note: Option<&str>,
        priority: Option<&str>,
    ) -> Result<ProjectDto, AppError> {
        let title = title.trim();
        if title.is_empty() {
            return Err(AppError::Validation("项目名称不能为空".to_string()));
        }

        let priority_enum = common_task_utils::parse_priority(priority)?;

        let path = helpers::build_project_path(conn, space_id, parent_id, title).await?;

        let now = now_ms();
        let id = Uuid::new_v4().to_string();

        let active_model = projects::ActiveModel {
            id: Set(id.clone()),
            space_id: Set(space_id.to_string()),
            parent_id: Set(parent_id.map(|s| s.to_string())),
            path: Set(path.clone()),
            title: Set(title.to_string()),
            note: Set(note.map(|s| s.to_string())),
            priority: Set(priority_enum),
            todo_task_count: Set(0),
            done_task_count: Set(0),
            last_task_updated_at: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
            archived_at: Set(None),
            deleted_at: Set(None),
            create_by: Set("stonefish".to_string()),
            rank: Set(1024),
        };

        let res = active_model.insert(conn).await.map_err(AppError::from)?;

        Ok(model_to_dto(res))
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
