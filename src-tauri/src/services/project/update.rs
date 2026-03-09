use sea_orm::{DatabaseConnection, Set, TransactionTrait};

use crate::db::{entities::projects, now_ms};
use crate::repos::{
    common_task_utils,
    link_repo::{self, LinkEntity},
    project_repo::{activity_logs, helpers as repo_helpers, mutation, query, ProjectRepo},
    tag_repo::{self, TagEntity},
};
use crate::types::error::AppError;

use super::{
    dto::ProjectUpdateInput,
    helpers::{is_default_project_id, priority_to_string},
    ProjectService,
};

impl ProjectService {
    pub async fn update(
        conn: &DatabaseConnection,
        input: ProjectUpdateInput,
    ) -> Result<(), AppError> {
        let ProjectUpdateInput { project_id, patch } = input;
        let txn = conn.begin().await.map_err(AppError::from)?;
        let model = query::find_by_id(&txn, project_id.as_str()).await?;

        if is_default_project_id(project_id.as_str())
            && (patch.title.is_some() || patch.space_id.is_some() || patch.parent_id.is_some())
        {
            return Err(AppError::Validation(
                "默认项目不允许修改标题、Space 或父级".to_string(),
            ));
        }

        let now = now_ms();
        let old_space_id = model.space_id.clone();
        let old_path = model.path.clone();
        let old_title = model.title.clone();
        let old_note = model.note.clone();
        let old_priority = model.priority.clone();
        let old_parent_id = model.parent_id.clone();

        let mut next_space_id = old_space_id.clone();
        let mut next_title = old_title.clone();
        let mut next_note = old_note.clone();
        let mut next_priority = old_priority.clone();
        let mut next_parent_id = old_parent_id.clone();
        let mut changed_any = false;
        let mut path_changed = false;
        let mut space_changed = false;
        let mut next_path = old_path.clone();

        let mut active_model: projects::ActiveModel = model.clone().into();

        if patch.tags.is_some() || patch.links.is_some() {
            changed_any = true;
        }

        if let Some(title) = patch.title.as_deref() {
            let normalized = title.trim();
            if normalized.is_empty() {
                return Err(AppError::Validation("项目名称不能为空".to_string()));
            }
            if normalized != old_title {
                next_title = normalized.to_string();
                active_model.title = Set(next_title.clone());
                changed_any = true;
            }
        }

        if let Some(note_opt) = patch.note {
            let normalized_note = note_opt.and_then(|value| {
                let trimmed = value.trim();
                if trimmed.is_empty() {
                    None
                } else {
                    Some(trimmed.to_string())
                }
            });
            if normalized_note != model.note {
                next_note = normalized_note.clone();
                active_model.note = Set(normalized_note);
                changed_any = true;
            }
        }

        if let Some(priority) = patch.priority.as_deref() {
            let parsed = common_task_utils::parse_priority(Some(priority))?;
            if parsed != model.priority {
                next_priority = parsed.clone();
                active_model.priority = Set(parsed);
                changed_any = true;
            }
        }

        if let Some(space_id) = patch.space_id.as_deref() {
            let normalized = space_id.trim();
            if normalized.is_empty() {
                return Err(AppError::Validation("所属 Space 不能为空".to_string()));
            }

            if normalized != old_space_id {
                let subtree_ids =
                    ProjectRepo::collect_subtree_ids(&txn, project_id.as_str()).await?;
                if subtree_ids.len() > 1 {
                    return Err(AppError::Validation(
                        "当前项目存在子项目，暂不支持跨 Space 迁移".to_string(),
                    ));
                }

                next_space_id = normalized.to_string();
                active_model.space_id = Set(next_space_id.clone());
                space_changed = true;
                changed_any = true;

                if patch.parent_id.is_none() && old_parent_id.is_some() {
                    next_parent_id = None;
                    active_model.parent_id = Set(None);
                    changed_any = true;
                }
            }
        }

        if let Some(parent_input) = patch.parent_id {
            if let Some(parent_id) = parent_input.as_deref() {
                if parent_id == project_id {
                    return Err(AppError::Validation("项目不能挂载到自身".to_string()));
                }
                let subtree_ids =
                    ProjectRepo::collect_subtree_ids(&txn, project_id.as_str()).await?;
                if subtree_ids.iter().any(|id| id == parent_id) {
                    return Err(AppError::Validation("项目不能挂载到自身后代".to_string()));
                }
            }

            if parent_input != old_parent_id {
                next_parent_id = parent_input;
                active_model.parent_id = Set(next_parent_id.clone());
                changed_any = true;
            }
        }

        if next_title != old_title || next_parent_id != old_parent_id || space_changed {
            let rebuilt_path = repo_helpers::build_project_path(
                &txn,
                &next_space_id,
                next_parent_id.as_deref(),
                next_title.as_str(),
            )
            .await?;
            if rebuilt_path != old_path {
                next_path = rebuilt_path;
                active_model.path = Set(next_path.clone());
                path_changed = true;
                changed_any = true;
            }
        }

        if !changed_any {
            return Err(AppError::Validation("没有可更新的字段".to_string()));
        }

        active_model.updated_at = Set(now);
        let saved_model = mutation::update(&txn, active_model).await?;

        if space_changed {
            mutation::update_tasks_space_by_project(&txn, project_id.as_str(), &next_space_id, now)
                .await?;
        }

        if let Some(tags) = patch.tags.as_ref() {
            tag_repo::sync_tags(&txn, TagEntity::Project, project_id.as_str(), tags, now).await?;
        }
        if let Some(links) = patch.links.as_ref() {
            link_repo::sync_links(&txn, LinkEntity::Project, project_id.as_str(), links).await?;
        }

        if path_changed {
            mutation::rebase_descendant_paths(&txn, &old_space_id, &old_path, &next_path, now)
                .await?;
        }

        let log_ctx = activity_logs::ProjectLogCtx {
            project_id: project_id.as_str(),
            space_id: saved_model.space_id.as_str(),
            create_by: saved_model.create_by.as_str(),
            created_at: now,
        };
        activity_logs::append_field_updated(
            &txn,
            log_ctx.clone(),
            "spaceId",
            "所属 Space",
            Some(old_space_id),
            Some(next_space_id),
        )
        .await?;
        activity_logs::append_field_updated(
            &txn,
            log_ctx.clone(),
            "title",
            "项目标题",
            Some(old_title),
            Some(next_title),
        )
        .await?;
        activity_logs::append_field_updated(
            &txn,
            log_ctx.clone(),
            "note",
            "项目备注",
            old_note,
            next_note,
        )
        .await?;
        activity_logs::append_field_updated(
            &txn,
            log_ctx.clone(),
            "priority",
            "优先级",
            Some(priority_to_string(&old_priority)),
            Some(priority_to_string(&next_priority)),
        )
        .await?;
        activity_logs::append_field_updated(
            &txn,
            log_ctx,
            "parentId",
            "父项目",
            old_parent_id,
            next_parent_id,
        )
        .await?;

        txn.commit().await.map_err(AppError::from)?;
        Ok(())
    }
}
