//! Task 维度的链接适配层。
//! 重点：通过 LinkEntity 区分 Task/Project，底层逻辑可复用。

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
    // 任务链接读取同样是对通用 link_repo 的轻量封装。
    link_repo::load_links(conn, LinkEntity::Task, task_ids).await
}

/// 同步单个任务的链接集合。
pub async fn sync_links<C>(conn: &C, task_id: &str, links: &[LinkInputDto]) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    link_repo::sync_links(conn, LinkEntity::Task, task_id, links).await
}
