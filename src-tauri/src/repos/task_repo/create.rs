//! Task 创建逻辑。
//! 重点：创建时默认状态为 todo、默认优先级为 P1，并计算末尾 rank。

use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};
use uuid::Uuid;

use crate::db::entities::{
    sea_orm_active_enums::{DoneReason, Priority, TaskStatus},
    tasks,
};
use crate::db::now_ms;
use crate::types::{
    dto::{CustomFieldsDto, LinkInputDto, TaskDto},
    error::AppError,
};

use super::{activity_logs, custom_fields, links, stats, tags, validations};

#[derive(Debug, Clone, Default)]
pub struct TaskCreatePatchInput {
    pub status: Option<String>,
    pub done_reason: Option<String>,
    pub priority: Option<String>,
    pub note: Option<String>,
    pub deadline_at: Option<i64>,
    pub tags: Option<Vec<String>>,
    pub links: Option<Vec<LinkInputDto>>,
    pub custom_fields: Option<CustomFieldsDto>,
}

pub async fn create(
    conn: &DatabaseConnection,
    space_id: &str,
    title: &str,
    auto_start: bool,
    project_id: Option<&str>,
) -> Result<TaskDto, AppError> {
    create_with_patch(
        conn,
        space_id,
        title,
        auto_start,
        project_id,
        TaskCreatePatchInput::default(),
    )
    .await
}

pub async fn create_with_patch(
    conn: &DatabaseConnection,
    space_id: &str,
    title: &str,
    auto_start: bool,
    project_id: Option<&str>,
    patch: TaskCreatePatchInput,
) -> Result<TaskDto, AppError> {
    let txn = conn.begin().await.map_err(AppError::from)?;

    let title = validations::trim_and_validate_title(title)?;

    let now = now_ms();
    let id = Uuid::new_v4().to_string();
    let _auto_start = auto_start;
    let status = match patch.status.as_deref() {
        Some(status) => match validations::normalize_status(status)?.as_str() {
            "done" => TaskStatus::Done,
            _ => TaskStatus::Todo,
        },
        None => TaskStatus::Todo,
    };
    let done_reason = if status == TaskStatus::Done {
        let reason = patch.done_reason.as_deref().unwrap_or("completed");
        let reason = validations::normalize_done_reason(reason)?;
        Some(match reason.as_str() {
            "cancelled" => DoneReason::Cancelled,
            _ => DoneReason::Completed,
        })
    } else {
        None
    };
    let priority = match patch.priority.as_deref() {
        Some(priority) => match validations::normalize_priority(priority)?.as_str() {
            "P0" => Priority::P0,
            "P2" => Priority::P2,
            "P3" => Priority::P3,
            _ => Priority::P1,
        },
        None => Priority::P1,
    };
    let note = patch
        .note
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    let deadline_at = patch.deadline_at;
    let normalized_tags = normalize_tags(patch.tags.unwrap_or_default());
    let normalized_links = patch.links.unwrap_or_default();
    let normalized_custom_fields = patch
        .custom_fields
        .map(custom_fields::normalize_custom_fields)
        .transpose()?;
    let custom_fields_json = normalized_custom_fields
        .as_ref()
        .map(custom_fields::serialize_custom_fields)
        .transpose()?;

    // 重点：读取同分组最大 rank，把新任务插到“列表底部”。
    let max_rank_task = tasks::Entity::find()
        .filter(tasks::Column::SpaceId.eq(space_id))
        .filter(tasks::Column::Status.eq(status.clone()))
        .filter(tasks::Column::Priority.eq(priority.clone()))
        .filter(tasks::Column::DeletedAt.is_null())
        .order_by_desc(tasks::Column::Rank)
        .one(&txn)
        .await
        .map_err(AppError::from)?;

    let rank = max_rank_task.map(|t| t.rank + 1024).unwrap_or(1024);

    let updated_at = now;
    let create_by = "stonefish";

    let active_model = tasks::ActiveModel {
        id: Set(id.clone()),
        space_id: Set(space_id.to_string()),
        project_id: Set(project_id.map(|s| s.to_string())),
        title: Set(title.clone()),
        note: Set(note.clone()),
        status: Set(status.clone()),
        done_reason: Set(done_reason.clone()),
        priority: Set(priority.clone()),
        rank: Set(rank),
        created_at: Set(now),
        updated_at: Set(updated_at),
        completed_at: Set(done_reason.as_ref().map(|_| now)),
        deadline_at: Set(deadline_at),
        archived_at: Set(None),
        deleted_at: Set(None),
        custom_fields: Set(custom_fields_json.clone()),
        create_by: Set(create_by.to_string()),
    };

    active_model.insert(&txn).await.map_err(AppError::from)?;

    if !normalized_tags.is_empty() {
        tags::sync_tags(&txn, &id, &normalized_tags).await?;
    }
    if !normalized_links.is_empty() {
        links::sync_links(&txn, &id, &normalized_links).await?;
    }

    activity_logs::append_created(
        &txn,
        activity_logs::TaskLogCtx {
            task_id: &id,
            space_id,
            project_id,
            create_by,
            created_at: now,
        },
        &title,
    )
    .await?;

    if let Some(project_id) = project_id {
        stats::refresh_project_stats(&txn, project_id, now).await?;
    }

    txn.commit().await.map_err(AppError::from)?;

    Ok(TaskDto {
        id,
        space_id: space_id.to_string(),
        project_id: project_id.map(|s| s.to_string()),
        title,
        note,
        status: match status {
            TaskStatus::Done => "done".to_string(),
            TaskStatus::Todo => "todo".to_string(),
        },
        done_reason: done_reason.as_ref().map(|value| match value {
            DoneReason::Completed => "completed".to_string(),
            DoneReason::Cancelled => "cancelled".to_string(),
        }),
        priority: match priority {
            Priority::P0 => "P0".to_string(),
            Priority::P1 => "P1".to_string(),
            Priority::P2 => "P2".to_string(),
            Priority::P3 => "P3".to_string(),
        },
        tags: normalized_tags,
        rank,
        created_at: now,
        updated_at,
        completed_at: done_reason.as_ref().map(|_| now),
        deadline_at,
        archived_at: None,
        deleted_at: None,
        links: Vec::new(),
        custom_fields: normalized_custom_fields,
        create_by: create_by.to_string(),
    })
}

fn normalize_tags(values: Vec<String>) -> Vec<String> {
    let mut normalized = Vec::new();
    for value in values {
        let tag = value.trim();
        if tag.is_empty() || normalized.iter().any(|item: &String| item == tag) {
            continue;
        }
        normalized.push(tag.to_string());
    }
    normalized
}
