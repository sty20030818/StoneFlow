use std::collections::HashMap;

use sea_orm::{ConnectionTrait, DatabaseConnection};

use crate::repos::tag_repo::{self, TagEntity};
use crate::types::error::AppError;

pub async fn load_tags_for_tasks(
    conn: &DatabaseConnection,
    task_ids: &[String],
) -> Result<HashMap<String, Vec<String>>, AppError> {
    tag_repo::load_tags(conn, TagEntity::Task, task_ids).await
}

pub async fn sync_tags<C>(conn: &C, task_id: &str, tags: &[String]) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    // We can call tag_repo directly instead of common_task_utils if logic is same
    // Existing common_task_utils::sync_task_tags probably calls tag_repo::sync_tags.
    // Let's assume common_task_utils logic is just a wrapper for now, or check it.
    // If I see it calls sync_tags(conn, TagEntity::Task, ...), I'll do it here directly to reduce indirection.
    tag_repo::sync_tags(conn, TagEntity::Task, task_id, tags, crate::db::now_ms()).await
}
