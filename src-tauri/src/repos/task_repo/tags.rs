use std::collections::HashMap;

use rusqlite::Connection;

use crate::repos::common_task_utils;
use crate::repos::tag_repo::{self, TagEntity};
use crate::types::error::AppError;

pub fn load_tags_for_tasks(
    conn: &Connection,
    task_ids: &[String],
) -> Result<HashMap<String, Vec<String>>, AppError> {
    tag_repo::load_tags(conn, TagEntity::Task, task_ids)
}

pub fn sync_tags(conn: &Connection, task_id: &str, tags: &[String]) -> Result<(), AppError> {
    common_task_utils::sync_task_tags(conn, task_id, tags)
}
