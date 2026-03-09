//! 项目排序用例。
//!
//! 项目排序除了改 rank，还可能伴随父节点变化，
//! 因此有时还要一起重建 path 并回刷子节点路径。

use sea_orm::{DatabaseConnection, Set, TransactionTrait};

use crate::db::{entities::projects, now_ms};
use crate::repos::project_repo::{helpers as repo_helpers, mutation, query};
use crate::types::error::AppError;

use super::ProjectService;

impl ProjectService {
    /// 调整单个项目的 rank，并在必要时同步父节点与路径。
    pub async fn reorder(
        conn: &DatabaseConnection,
        project_id: &str,
        new_rank: i64,
        new_parent_id: Option<Option<String>>,
    ) -> Result<(), AppError> {
        let txn = conn.begin().await.map_err(AppError::from)?;
        let model = query::find_by_id(&txn, project_id).await?;
        let now = now_ms();
        let old_path = model.path.clone();
        let old_parent_id = model.parent_id.clone();
        let mut next_path = old_path.clone();
        let mut path_changed = false;

        let mut active_model: projects::ActiveModel = model.clone().into();
        active_model.rank = Set(new_rank);
        active_model.updated_at = Set(now);

        // 只有父节点真的变化时，才需要重建 path 并回刷后代路径。
        if let Some(parent_id) = new_parent_id {
            active_model.parent_id = Set(parent_id.clone());
            if old_parent_id != parent_id {
                next_path = repo_helpers::build_project_path(
                    &txn,
                    &model.space_id,
                    parent_id.as_deref(),
                    &model.title,
                )
                .await?;
                active_model.path = Set(next_path.clone());
                path_changed = true;
            }
        }

        mutation::update(&txn, active_model).await?;
        if path_changed {
            mutation::rebase_descendant_paths(&txn, &model.space_id, &old_path, &next_path, now)
                .await?;
        }
        txn.commit().await.map_err(AppError::from)?;
        Ok(())
    }

    /// 按给定顺序批量重排项目 rank。
    pub async fn rebalance(
        conn: &DatabaseConnection,
        project_ids: &[String],
        step: i64,
    ) -> Result<(), AppError> {
        let txn = conn.begin().await.map_err(AppError::from)?;
        let now = now_ms();
        for (index, project_id) in project_ids.iter().enumerate() {
            let Some(model) = query::find_optional_by_id(&txn, project_id).await? else {
                continue;
            };
            let mut active_model: projects::ActiveModel = model.into();
            active_model.rank = Set((index as i64) * step);
            active_model.updated_at = Set(now);
            mutation::update(&txn, active_model).await?;
        }
        txn.commit().await.map_err(AppError::from)?;
        Ok(())
    }
}
