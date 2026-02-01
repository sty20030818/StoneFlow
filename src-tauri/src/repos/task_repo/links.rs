use std::collections::HashMap;

use sea_orm::{ConnectionTrait, DatabaseConnection};

use crate::repos::link_repo::{self, LinkEntity};
use crate::types::{
    dto::{LinkDto, LinkInputDto},
    error::AppError,
};

pub async fn load_links_for_tasks(
    conn: &DatabaseConnection,
    task_ids: &[String],
) -> Result<HashMap<String, Vec<LinkDto>>, AppError> {
    link_repo::load_links(conn, LinkEntity::Task, task_ids).await
}

pub async fn sync_links<C>(conn: &C, task_id: &str, links: &[LinkInputDto]) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    link_repo::sync_links(conn, LinkEntity::Task, task_id, links).await
}
