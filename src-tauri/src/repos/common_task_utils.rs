use rusqlite::Connection;

use crate::db::now_ms;
use crate::repos::link_repo::{self, LinkEntity};
use crate::repos::tag_repo::{self, TagEntity};
use crate::types::{dto::LinkInputDto, error::AppError};

pub fn normalize_priority(priority: &str) -> String {
    priority.trim().to_uppercase()
}

pub fn validate_priority(priority: &str) -> Result<(), AppError> {
    let normalized = normalize_priority(priority);
    if matches!(normalized.as_str(), "P0" | "P1" | "P2" | "P3") {
        Ok(())
    } else {
        Err(AppError::Validation(
            "优先级必须是 P0, P1, P2 或 P3".to_string(),
        ))
    }
}

pub fn normalize_status(status: &str) -> String {
    status.trim().to_lowercase()
}

pub fn validate_status(status: &str) -> Result<String, AppError> {
    let normalized = normalize_status(status);
    if normalized == "todo" || normalized == "done" {
        Ok(normalized)
    } else {
        Err(AppError::Validation("状态必须为 todo 或 done".to_string()))
    }
}

pub fn normalize_done_reason(reason: &str) -> Result<String, AppError> {
    let normalized = reason.trim().to_lowercase();
    if normalized == "completed" || normalized == "cancelled" {
        Ok(normalized)
    } else {
        Err(AppError::Validation(
            "doneReason 必须为 completed 或 cancelled".to_string(),
        ))
    }
}

pub fn should_touch_updated_at(touch_updated_at: bool, updated_at_written: bool) -> bool {
    touch_updated_at && !updated_at_written
}

pub fn sync_task_links(
    conn: &Connection,
    task_id: &str,
    links: &[LinkInputDto],
) -> Result<(), AppError> {
    link_repo::sync_links(conn, LinkEntity::Task, task_id, links)
}

pub fn sync_task_tags(conn: &Connection, task_id: &str, tags: &[String]) -> Result<(), AppError> {
    tag_repo::sync_tags(conn, TagEntity::Task, task_id, tags, now_ms())
}
