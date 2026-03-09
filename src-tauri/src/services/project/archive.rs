//! 项目归档相关用例。
//!
//! 这里把归档和取消归档放在同一个文件里，
//! 因为它们共享几乎完全相同的约束和副作用。

use sea_orm::{DatabaseConnection, IntoActiveModel, Set, TransactionTrait};

use crate::db::{entities::projects, now_ms};
use crate::repos::project_repo::{activity_logs, mutation, query};
use crate::types::error::AppError;

use super::{helpers::is_default_project_id, ProjectService};

impl ProjectService {
    /// 归档项目。
    pub async fn archive(conn: &DatabaseConnection, project_id: &str) -> Result<(), AppError> {
        if is_default_project_id(project_id) {
            return Err(AppError::Validation("默认项目不允许归档".to_string()));
        }

        let txn = conn.begin().await.map_err(AppError::from)?;
        let model = query::find_by_id(&txn, project_id).await?;
        if model.deleted_at.is_some() {
            return Err(AppError::Validation("已删除项目不允许归档".to_string()));
        }
        if model.archived_at.is_some() {
            return Ok(());
        }

        let now = now_ms();
        let mut active_model: projects::ActiveModel = model.into_active_model();
        active_model.archived_at = Set(Some(now));
        active_model.updated_at = Set(now);
        let saved_model = mutation::update(&txn, active_model).await?;
        activity_logs::append_archived(
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

    /// 取消归档项目。
    pub async fn unarchive(conn: &DatabaseConnection, project_id: &str) -> Result<(), AppError> {
        if is_default_project_id(project_id) {
            return Err(AppError::Validation("默认项目不允许取消归档".to_string()));
        }

        let txn = conn.begin().await.map_err(AppError::from)?;
        let model = query::find_by_id(&txn, project_id).await?;
        if model.deleted_at.is_some() {
            return Err(AppError::Validation("已删除项目不允许取消归档".to_string()));
        }
        if model.archived_at.is_none() {
            return Ok(());
        }

        let now = now_ms();
        let mut active_model: projects::ActiveModel = model.into_active_model();
        active_model.archived_at = Set(None);
        active_model.updated_at = Set(now);
        let saved_model = mutation::update(&txn, active_model).await?;
        activity_logs::append_unarchived(
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
