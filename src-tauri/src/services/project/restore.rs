//! 项目恢复用例。

use sea_orm::{DatabaseConnection, IntoActiveModel, Set, TransactionTrait};

use crate::db::{entities::projects, now_ms};
use crate::repos::project_repo::{activity_logs, mutation, query};
use crate::types::error::AppError;

use super::ProjectService;

impl ProjectService {
    /// 恢复已软删除项目。
    pub async fn restore(conn: &DatabaseConnection, project_id: &str) -> Result<(), AppError> {
        let txn = conn.begin().await.map_err(AppError::from)?;
        let model = query::find_by_id(&txn, project_id).await?;
        let now = now_ms();
        let mut active_model: projects::ActiveModel = model.into_active_model();
        active_model.deleted_at = Set(None);
        active_model.updated_at = Set(now);
        let saved_model = mutation::update(&txn, active_model).await?;
        activity_logs::append_restored(
            &txn,
            activity_logs::ProjectLogCtx {
                project_id: saved_model.id.as_str(),
                space_id: saved_model.space_id.as_str(),
                create_by: saved_model.create_by.as_str(),
                created_at: now,
            },
            saved_model.title.as_str(),
        )
        .await?;
        txn.commit().await.map_err(AppError::from)?;
        Ok(())
    }
}
