use sea_orm::{DatabaseConnection, TransactionTrait};
use uuid::Uuid;

use crate::db::now_ms;
use crate::repos::{
    common_task_utils,
    link_repo::{self, LinkEntity},
    project_repo::{activity_logs, helpers as repo_helpers, mutation, query},
    tag_repo::{self, TagEntity},
};
use crate::types::{dto::ProjectDto, error::AppError};

use super::{dto::ProjectCreateInput, ProjectService};

impl ProjectService {
    pub async fn create(
        conn: &DatabaseConnection,
        input: ProjectCreateInput,
    ) -> Result<ProjectDto, AppError> {
        let txn = conn.begin().await.map_err(AppError::from)?;
        let title = input.title.trim();
        if title.is_empty() {
            return Err(AppError::Validation("项目名称不能为空".to_string()));
        }
        let note = input.note.as_deref().and_then(|value| {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        });
        let tags = input.tags.unwrap_or_default();
        let links = input.links.unwrap_or_default();
        let priority = common_task_utils::parse_priority(input.priority.as_deref())?;
        let path = repo_helpers::build_project_path(
            &txn,
            &input.space_id,
            input.parent_id.as_deref(),
            title,
        )
        .await?;
        let now = now_ms();
        let id = Uuid::new_v4().to_string();
        let rank = input.rank.unwrap_or(
            query::next_rank_in_scope(&txn, &input.space_id, input.parent_id.as_deref()).await?,
        );

        let project = mutation::insert(
            &txn,
            mutation::NewProjectRecord {
                id: id.clone(),
                space_id: input.space_id,
                parent_id: input.parent_id,
                path,
                title: title.to_string(),
                note,
                priority,
                rank,
                created_at: now,
                updated_at: now,
                create_by: "stonefish".to_string(),
            },
        )
        .await?;

        if !tags.is_empty() {
            tag_repo::sync_tags(&txn, TagEntity::Project, &id, &tags, now).await?;
        }
        if !links.is_empty() {
            link_repo::sync_links(&txn, LinkEntity::Project, &id, &links).await?;
        }
        activity_logs::append_created(
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

        txn.commit().await.map_err(AppError::from)?;

        let mut dto = repo_helpers::project_model_to_dto(project);
        repo_helpers::attach_links(conn, std::slice::from_mut(&mut dto)).await?;
        repo_helpers::attach_tags(conn, std::slice::from_mut(&mut dto)).await?;
        Ok(dto)
    }
}
