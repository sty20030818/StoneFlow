use sea_orm::{DatabaseConnection, TransactionTrait};

use crate::db::now_ms;
use crate::repos::project_repo::{activity_logs, mutation, query, ProjectRepo};
use crate::repos::task_repo::TaskRepo;
use crate::types::error::AppError;

use super::ProjectService;

impl ProjectService {
    pub async fn delete_subtree(
        conn: &DatabaseConnection,
        project_id: &str,
    ) -> Result<(), AppError> {
        let txn = conn.begin().await.map_err(AppError::from)?;
        let subtree_project_ids = ProjectRepo::collect_subtree_ids(&txn, project_id).await?;
        let project_models = query::find_not_deleted_by_ids(&txn, &subtree_project_ids).await?;
        let now = now_ms();
        TaskRepo::soft_delete_by_project_ids(&txn, &subtree_project_ids, now).await?;
        mutation::soft_delete_by_ids(&txn, &subtree_project_ids, now).await?;

        for project in &project_models {
            activity_logs::append_deleted(
                &txn,
                activity_logs::ProjectLogCtx {
                    project_id: project.id.as_str(),
                    space_id: project.space_id.as_str(),
                    create_by: project.create_by.as_str(),
                    created_at: now,
                },
                project.title.as_str(),
            )
            .await?;
        }

        txn.commit().await.map_err(AppError::from)?;
        Ok(())
    }
}
