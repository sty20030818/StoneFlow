//! Task 仓储入口。
//!
//! 最终态职责：
//! - 暴露任务查询能力
//! - 暴露供 service 组合的持久化原语模块
//! - 不承载完整写用例、事务边界或跨实体业务编排

use sea_orm::{ConnectionTrait, DatabaseConnection};

use crate::types::{dto::TaskDto, error::AppError};

pub struct TaskRepo;

pub mod activity_logs;
pub mod custom_fields;
pub mod delete;
pub mod links;
pub mod list;
pub mod mutation;
pub mod query;
pub mod stats;
pub mod tags;
pub mod validations;

pub use list::list;

impl TaskRepo {
    pub async fn list(
        conn: &DatabaseConnection,
        space_id: Option<&str>,
        status: Option<&str>,
        project_id: Option<&str>,
    ) -> Result<Vec<TaskDto>, AppError> {
        list(conn, space_id, status, project_id).await
    }

    pub async fn list_deleted(
        conn: &DatabaseConnection,
        space_id: Option<&str>,
        status: Option<&str>,
        project_id: Option<&str>,
    ) -> Result<Vec<TaskDto>, AppError> {
        list::list_deleted(conn, space_id, status, project_id).await
    }

    pub async fn soft_delete_by_project_ids<C>(
        conn: &C,
        project_ids: &[String],
        now: i64,
    ) -> Result<usize, AppError>
    where
        C: ConnectionTrait,
    {
        delete::soft_delete_by_project_ids(conn, project_ids, now).await
    }
}
