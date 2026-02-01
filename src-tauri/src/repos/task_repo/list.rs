use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder};

use crate::db::entities::{sea_orm_active_enums::TaskStatus, tasks};
use crate::types::{dto::TaskDto, error::AppError};

use super::{custom_fields, links, tags};

pub async fn list(
    conn: &DatabaseConnection,
    space_id: Option<&str>,
    status: Option<&str>,
    project_id: Option<&str>,
) -> Result<Vec<TaskDto>, AppError> {
    let mut query = tasks::Entity::find();

    if let Some(sid) = space_id {
        query = query.filter(tasks::Column::SpaceId.eq(sid));
    }

    if let Some(stat) = status {
        // Map string to enum
        let status_enum = match stat {
            "todo" => TaskStatus::Todo,
            "done" => TaskStatus::Done,
            _ => TaskStatus::Todo, // Fallback or strict? Existing code allows string
        };
        query = query.filter(tasks::Column::Status.eq(status_enum));
    }

    if let Some(pid) = project_id {
        query = query.filter(tasks::Column::ProjectId.eq(pid));
    }

    // Default sorting: rank DESC, created_at DESC
    query = query
        .order_by_desc(tasks::Column::Rank)
        .order_by_desc(tasks::Column::CreatedAt);

    let models = query.all(conn).await.map_err(AppError::from)?;

    let mut dtos = Vec::with_capacity(models.len());
    for m in models {
        let custom_fields = custom_fields::parse_from_json_string(m.custom_fields.as_deref());

        dtos.push(TaskDto {
            id: m.id,
            space_id: m.space_id,
            project_id: m.project_id,
            title: m.title,
            note: m.note,
            status: match m.status {
                TaskStatus::Todo => "todo".to_string(),
                TaskStatus::Done => "done".to_string(),
            },
            done_reason: m.done_reason.map(|r| match r {
                crate::db::entities::sea_orm_active_enums::DoneReason::Completed => {
                    "completed".to_string()
                }
                crate::db::entities::sea_orm_active_enums::DoneReason::Cancelled => {
                    "cancelled".to_string()
                }
            }),
            priority: match m.priority {
                crate::db::entities::sea_orm_active_enums::Priority::P0 => "P0".to_string(),
                crate::db::entities::sea_orm_active_enums::Priority::P1 => "P1".to_string(),
                crate::db::entities::sea_orm_active_enums::Priority::P2 => "P2".to_string(),
                crate::db::entities::sea_orm_active_enums::Priority::P3 => "P3".to_string(),
            },
            tags: Vec::new(),
            rank: m.rank,
            created_at: m.created_at,
            updated_at: m.updated_at,
            completed_at: m.completed_at,
            deadline_at: m.deadline_at,
            archived_at: m.archived_at,
            deleted_at: m.deleted_at,
            links: Vec::new(),
            custom_fields,
            create_by: m.create_by,
        });
    }

    if !dtos.is_empty() {
        let task_ids = dtos.iter().map(|t| t.id.clone()).collect::<Vec<_>>();
        let tag_map = tags::load_tags_for_tasks(conn, &task_ids).await?;
        let link_map = links::load_links_for_tasks(conn, &task_ids).await?;
        for task in &mut dtos {
            task.links = link_map.get(&task.id).cloned().unwrap_or_default();
            task.tags = tag_map.get(&task.id).cloned().unwrap_or_default();
        }
    }

    Ok(dtos)
}
