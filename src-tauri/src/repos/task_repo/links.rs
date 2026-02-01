use std::collections::HashMap;

use rusqlite::Connection;

use crate::repos::{
    common_task_utils,
    link_repo::{self, LinkEntity},
};
use crate::types::{
    dto::{LinkDto, LinkInputDto},
    error::AppError,
};

pub fn load_links_for_tasks(
    conn: &Connection,
    task_ids: &[String],
) -> Result<HashMap<String, Vec<LinkDto>>, AppError> {
    link_repo::load_links(conn, LinkEntity::Task, task_ids)
}

pub fn sync_links(
    conn: &Connection,
    task_id: &str,
    links: &[LinkInputDto],
) -> Result<(), AppError> {
    common_task_utils::sync_task_links(conn, task_id, links)
}
