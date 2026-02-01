use std::collections::HashSet;

use rusqlite::{params, types::Value, Connection};

use crate::db::now_ms;
use crate::repos::common_task_utils;
use crate::types::{
    dto::{CustomFieldsDto, LinkInputDto},
    error::AppError,
};

use super::{custom_fields, links, stats, tags, update_builder::TaskUpdateBuilder, validations};

#[allow(clippy::too_many_arguments)]
pub fn update(
    conn: &mut Connection,
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
    let tx = conn.transaction()?;

    if !super::TaskRepo::task_exists(&tx, id)? {
        return Err(AppError::Validation("任务不存在".to_string()));
    }

    let now = now_ms();
    let previous_project_id = tx.query_row(
        "SELECT project_id FROM tasks WHERE id = ?1",
        params![id],
        |row| row.get::<_, Option<String>>(0),
    )?;

    let mut builder = TaskUpdateBuilder::new();
    let mut touch_updated_at = false;
    let mut changed_any = false;

    if let Some(title) = title {
        let title = validations::trim_and_validate_title(title)?;
        builder.add_set("title = ?", Value::Text(title));
        touch_updated_at = true;
    }

    if let Some(status) = status {
        let status = validations::normalize_status(status)?;
        builder.add_set("status = ?", Value::Text(status.clone()));
        touch_updated_at = true;

        if status == "done" {
            let reason = validations::require_done_reason(done_reason)?;
            builder.add_set("done_reason = ?", Value::Text(reason));
            builder.add_set("completed_at = ?", Value::Integer(now));
        } else {
            builder.add_raw_set("done_reason = NULL");
            builder.add_raw_set("completed_at = NULL");
        }
    } else if let Some(done_reason) = done_reason {
        let current_status: String = tx.query_row(
            "SELECT status FROM tasks WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )?;
        if current_status != "done" {
            return Err(AppError::Validation(
                "仅完成任务可设置 doneReason".to_string(),
            ));
        }
        let reason = validations::normalize_done_reason(
            done_reason.ok_or_else(|| AppError::Validation("doneReason 不可为空".to_string()))?,
        )?;
        builder.add_set("done_reason = ?", Value::Text(reason));
        touch_updated_at = true;
    }

    if let Some(priority) = priority {
        let priority = validations::normalize_priority(priority)?;
        builder.add_set("priority = ?", Value::Text(priority));
        touch_updated_at = true;
    }

    if let Some(note) = note {
        match note.map(str::trim).filter(|v| !v.is_empty()) {
            Some(value) => {
                builder.add_set("note = ?", Value::Text(value.to_string()));
            }
            None => {
                builder.add_raw_set("note = NULL");
            }
        }
        touch_updated_at = true;
    }

    if let Some(space_id) = space_id {
        builder.add_set("space_id = ?", Value::Text(space_id.to_string()));
        touch_updated_at = true;
    }

    if let Some(project_id) = project_id {
        match project_id {
            Some(value) => builder.add_set("project_id = ?", Value::Text(value.to_string())),
            None => builder.add_raw_set("project_id = NULL"),
        }
        touch_updated_at = true;
    }

    if let Some(deadline_at) = deadline_at {
        match deadline_at {
            Some(value) => builder.add_set("deadline_at = ?", Value::Integer(value)),
            None => builder.add_raw_set("deadline_at = NULL"),
        }
        touch_updated_at = true;
    }

    if let Some(rank) = rank {
        builder.add_set("rank = ?", Value::Integer(rank));
        touch_updated_at = true;
    }

    if let Some(links_input) = links_input {
        links::sync_links(&tx, id, &links_input)?;
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(custom_fields_input) = custom_fields_input {
        match custom_fields_input {
            Some(value) => {
                let normalized = custom_fields::normalize_custom_fields(value)?;
                let payload = custom_fields::serialize_custom_fields(&normalized)?;
                builder.add_set("custom_fields = ?", Value::Text(payload));
            }
            None => builder.add_raw_set("custom_fields = NULL"),
        }
        touch_updated_at = true;
    }

    if let Some(archived_at) = archived_at {
        match archived_at {
            Some(value) => builder.add_set("archived_at = ?", Value::Integer(value)),
            None => builder.add_raw_set("archived_at = NULL"),
        }
        touch_updated_at = true;
    }

    if let Some(deleted_at) = deleted_at {
        match deleted_at {
            Some(value) => builder.add_set("deleted_at = ?", Value::Integer(value)),
            None => builder.add_raw_set("deleted_at = NULL"),
        }
        touch_updated_at = true;
    }

    builder.finalize_updated_at(now);
    let updated_at_written = builder.updated_at_written();

    if let Some((sql, params)) = builder.build(id) {
        let changed = tx.execute(&sql, rusqlite::params_from_iter(params))?;
        if changed == 0 {
            return Err(AppError::Validation("任务不存在".to_string()));
        }
        changed_any = true;
    }

    if let Some(tags_input) = tags_input {
        touch_updated_at = true;
        tags::sync_tags(&tx, id, &tags_input)?;
        changed_any = true;
    }

    if common_task_utils::should_touch_updated_at(touch_updated_at, updated_at_written) {
        tx.execute(
            "UPDATE tasks SET updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        changed_any = true;
    }

    if !changed_any {
        return Err(AppError::Validation("没有可更新的字段".to_string()));
    }

    let current_project_id = tx.query_row(
        "SELECT project_id FROM tasks WHERE id = ?1",
        params![id],
        |row| row.get::<_, Option<String>>(0),
    )?;

    let mut touched_project_ids = HashSet::new();
    if let Some(value) = previous_project_id {
        touched_project_ids.insert(value);
    }
    if let Some(value) = current_project_id {
        touched_project_ids.insert(value);
    }
    for project_id in touched_project_ids {
        stats::refresh_project_stats(&tx, &project_id, now)?;
    }

    tx.commit()?;
    Ok(())
}
