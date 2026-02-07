//! Task 维度的标签适配层。
//! 重点：这里是薄封装，复用 `tag_repo` 的通用实现。

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
    // 统一入口：任务标签同步最终委托给通用 tag_repo。
    tag_repo::sync_tags(conn, TagEntity::Task, task_id, tags, crate::db::now_ms()).await
}
