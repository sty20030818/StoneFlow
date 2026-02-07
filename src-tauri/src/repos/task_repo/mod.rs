use sea_orm::PaginatorTrait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter,
    Set, TransactionTrait,
};

use crate::db::entities::{
    sea_orm_active_enums::{DoneReason, TaskStatus},
    tasks,
};
use crate::db::now_ms;
use crate::types::{
    dto::{CustomFieldsDto, LinkInputDto, TaskDto},
    error::AppError,
};

pub struct TaskRepo;

pub mod create;
pub mod custom_fields;
pub mod delete;
pub mod links;
pub mod list;
pub mod stats;
pub mod tags;
pub mod update;
pub mod validations;

pub use create::create;
pub use delete::{delete_many, restore_many};
pub use list::list;
pub use update::update;

#[derive(Debug, Clone)]
pub struct TaskUpdateInput {
    pub id: String,
    pub patch: TaskUpdatePatch,
}

#[derive(Debug, Clone, Default)]
pub struct TaskUpdatePatch {
    pub title: Option<String>,
    pub status: Option<String>,
    pub done_reason: Option<Option<String>>,
    pub priority: Option<String>,
    pub note: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub space_id: Option<String>,
    pub project_id: Option<Option<String>>,
    pub deadline_at: Option<Option<i64>>,
    pub rank: Option<i64>,
    pub links: Option<Vec<LinkInputDto>>,
    pub custom_fields: Option<Option<CustomFieldsDto>>,
    pub archived_at: Option<Option<i64>>,
    pub deleted_at: Option<Option<i64>>,
}

impl TaskUpdatePatch {
    pub fn rank_only(new_rank: i64) -> Self {
        Self {
            rank: Some(new_rank),
            ..Self::default()
        }
    }
}

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

    pub async fn create(
        conn: &DatabaseConnection,
        space_id: &str,
        title: &str,
        auto_start: bool,
        project_id: Option<&str>,
    ) -> Result<TaskDto, AppError> {
        create(conn, space_id, title, auto_start, project_id).await
    }

    pub async fn complete(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
        let now = now_ms();
        let txn = conn.begin().await.map_err(AppError::from)?;

        let task = tasks::Entity::find_by_id(id)
            .one(&txn)
            .await
            .map_err(AppError::from)?;

        let task = match task {
            Some(t) => t,
            None => return Err(AppError::Validation("任务不存在".to_string())),
        };

        let mut active = task.clone().into_active_model();
        active.status = Set(TaskStatus::Done);
        active.done_reason = Set(Some(DoneReason::Completed));
        active.completed_at = Set(Some(now));
        active.updated_at = Set(now);

        active.update(&txn).await.map_err(AppError::from)?;

        if let Some(pid) = &task.project_id {
            stats::refresh_project_stats(&txn, pid, now).await?;
        }

        txn.commit().await.map_err(AppError::from)?;
        Ok(())
    }

    pub async fn delete_many(conn: &DatabaseConnection, ids: &[String]) -> Result<usize, AppError> {
        delete_many(conn, ids).await
    }

    pub async fn restore_many(
        conn: &DatabaseConnection,
        ids: &[String],
    ) -> Result<usize, AppError> {
        restore_many(conn, ids).await
    }

    pub async fn update(conn: &DatabaseConnection, input: TaskUpdateInput) -> Result<(), AppError> {
        update(conn, input).await
    }
}

impl TaskRepo {
    #[allow(dead_code)]
    pub async fn task_exists(conn: &DatabaseConnection, id: &str) -> Result<bool, AppError> {
        let count = tasks::Entity::find()
            .filter(tasks::Column::Id.eq(id))
            .count(conn)
            .await
            .map_err(AppError::from)?;
        Ok(count > 0)
    }
}
