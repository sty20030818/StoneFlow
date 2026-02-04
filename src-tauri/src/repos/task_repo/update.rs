use std::collections::HashSet;

use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter,
    QueryOrder, Set, TransactionTrait,
};

use crate::db::entities::{
    sea_orm_active_enums::{DoneReason, Priority, TaskStatus},
    tasks,
};
use crate::db::now_ms;

use crate::types::{
    dto::{CustomFieldsDto, LinkInputDto},
    error::AppError,
};

use super::{custom_fields, links, stats, tags, validations};

#[allow(clippy::too_many_arguments)]
pub async fn update(
    conn: &DatabaseConnection,
    id: &str,
    title: Option<&str>,
    status: Option<&str>,
    done_reason: Option<Option<&str>>,
    priority: Option<&str>,
    note: Option<Option<&str>>,
    tags_input: Option<Vec<String>>,
    space_id: Option<&str>,
    project_id: Option<Option<&str>>,
    deadline_at: Option<Option<i64>>,
    rank: Option<i64>,
    links_input: Option<Vec<LinkInputDto>>,
    custom_fields_input: Option<Option<CustomFieldsDto>>,
    archived_at: Option<Option<i64>>,
    deleted_at: Option<Option<i64>>,
) -> Result<(), AppError> {
    let txn = conn.begin().await.map_err(AppError::from)?;

    // 1. Fetch existing task
    let task_model = tasks::Entity::find_by_id(id)
        .one(&txn)
        .await
        .map_err(AppError::from)?;

    let task_model = match task_model {
        Some(m) => m,
        None => return Err(AppError::Validation("任务不存在".to_string())),
    };

    let previous_project_id = task_model.project_id.clone();
    let current_status_is_done = task_model.status == TaskStatus::Done;
    let previous_status = task_model.status.clone();
    let previous_priority = task_model.priority.clone();
    let previous_space_id = task_model.space_id.clone();
    let mut effective_status = task_model.status.clone();
    let mut effective_priority = task_model.priority.clone();
    let mut effective_space_id = task_model.space_id.clone();
    let mut priority_changed = false;
    let mut status_changed_to_todo = false;
    let mut space_changed = false;
    let mut project_changed = false;

    let mut active_model = task_model.into_active_model();
    let now = now_ms();
    let mut touch_updated_at = false;
    let mut changed_any = false;

    // 2. Apply updates
    if let Some(title) = title {
        let title = validations::trim_and_validate_title(title)?;
        active_model.title = Set(title);
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(status_str) = status {
        let status_str = validations::normalize_status(status_str)?;
        let is_done = status_str == "done";

        if is_done {
            let reason_str = validations::require_done_reason(done_reason)?;
            let reason_enum = match reason_str.as_str() {
                "completed" => DoneReason::Completed,
                "cancelled" => DoneReason::Cancelled,
                _ => DoneReason::Completed,
            };
            active_model.status = Set(TaskStatus::Done);
            active_model.done_reason = Set(Some(reason_enum));
            active_model.completed_at = Set(Some(now));
            effective_status = TaskStatus::Done;
        } else {
            active_model.status = Set(TaskStatus::Todo);
            active_model.done_reason = Set(None);
            active_model.completed_at = Set(None);
            effective_status = TaskStatus::Todo;
            if previous_status == TaskStatus::Done {
                status_changed_to_todo = true;
            }
        }
        touch_updated_at = true;
        changed_any = true;
    } else if let Some(reason_opt) = done_reason {
        // Only update reason if status is done (or keep check)
        if !current_status_is_done {
            return Err(AppError::Validation(
                "仅完成任务可设置 doneReason".to_string(),
            ));
        }
        let reason = validations::normalize_done_reason(
            reason_opt.ok_or_else(|| AppError::Validation("doneReason 不可为空".to_string()))?,
        )?;
        let reason_enum = match reason.as_str() {
            "completed" => DoneReason::Completed,
            "cancelled" => DoneReason::Cancelled,
            _ => DoneReason::Completed,
        };
        active_model.done_reason = Set(Some(reason_enum));
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(priority_str) = priority {
        let priority_str = validations::normalize_priority(priority_str)?;
        let p_enum = match priority_str.as_str() {
            "P0" => Priority::P0,
            "P1" => Priority::P1,
            "P2" => Priority::P2,
            "P3" => Priority::P3,
            _ => Priority::P1,
        };
        active_model.priority = Set(p_enum.clone());
        effective_priority = p_enum;
        priority_changed = effective_priority != previous_priority;
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(note_opt) = note {
        active_model.note = Set(note_opt
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty()));
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(space_id) = space_id {
        active_model.space_id = Set(space_id.to_string());
        effective_space_id = space_id.to_string();
        space_changed = effective_space_id != previous_space_id;
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(project_id_opt) = project_id {
        let next_project_id = project_id_opt.map(|s| s.to_string());
        active_model.project_id = Set(next_project_id.clone());
        project_changed = next_project_id != previous_project_id;
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(deadline_opt) = deadline_at {
        active_model.deadline_at = Set(deadline_opt);
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(rank) = rank {
        active_model.rank = Set(rank);
        touch_updated_at = true;
        changed_any = true;
    } else if effective_status == TaskStatus::Todo
        && (priority_changed || status_changed_to_todo || space_changed || project_changed)
    {
        let max_rank_task = tasks::Entity::find()
            .filter(tasks::Column::SpaceId.eq(effective_space_id.clone()))
            .filter(tasks::Column::Status.eq(TaskStatus::Todo))
            .filter(tasks::Column::Priority.eq(effective_priority.clone()))
            .filter(tasks::Column::DeletedAt.is_null())
            .order_by_desc(tasks::Column::Rank)
            .one(&txn)
            .await
            .map_err(AppError::from)?;

        let new_rank = max_rank_task.map(|t| t.rank + 1024).unwrap_or(1024);
        active_model.rank = Set(new_rank);
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(archived_opt) = archived_at {
        active_model.archived_at = Set(archived_opt);
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(deleted_opt) = deleted_at {
        active_model.deleted_at = Set(deleted_opt);
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(custom_fields_opt) = custom_fields_input {
        match custom_fields_opt {
            Some(value) => {
                let normalized = custom_fields::normalize_custom_fields(value)?;
                let payload = custom_fields::serialize_custom_fields(&normalized)?;
                active_model.custom_fields = Set(Some(payload));
            }
            None => {
                active_model.custom_fields = Set(None);
            }
        }
        touch_updated_at = true;
        changed_any = true;
    }

    // Handle touch updated at
    if touch_updated_at {
        active_model.updated_at = Set(now);
    }

    // 3. Save Active Model
    // check changed_any? ActiveModel update only updates Set fields.
    // If nothing set, it might error or do nothing.
    // However, we handle links/tags separately which might set changed_any.

    let saved_model = active_model.update(&txn).await.map_err(AppError::from)?;
    let new_project_id = saved_model.project_id.clone();

    // 4. Handle Associations (Links / Tags)
    if let Some(links_input) = links_input {
        links::sync_links(&txn, id, &links_input).await?;
        changed_any = true;
        // Note: sync_links updates updated_at in links table, but maybe task updated_at should also be touched?
        // Logic above sets touch_updated_at = true if links_input is Some.
    }

    if let Some(tags_input) = tags_input {
        tags::sync_tags(&txn, id, &tags_input).await?;
        changed_any = true;
    }

    // We already set updated_at if touch_updated_at is true.

    if !changed_any {
        return Err(AppError::Validation("没有可更新的字段".to_string()));
    }

    // 5. Refresh Stats
    let mut touched_pids = HashSet::new();
    if let Some(pid) = previous_project_id {
        touched_pids.insert(pid);
    }
    if let Some(pid) = new_project_id {
        touched_pids.insert(pid);
    }

    for pid in touched_pids {
        stats::refresh_project_stats(&txn, &pid, now).await?;
    }

    txn.commit().await.map_err(AppError::from)?;
    Ok(())
}
