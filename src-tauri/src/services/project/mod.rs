//! 项目写用例服务。
//!
//! 本模块将承接项目创建、更新、删除子树、恢复、归档、
//! 取消归档与排序等写用例，并统一管理跨 repo 事务编排。

pub mod dto;
mod helpers;

use sea_orm::{DatabaseConnection, IntoActiveModel, Set, TransactionTrait};
use uuid::Uuid;

use crate::db::{entities::projects, now_ms};
use crate::repos::{
    common_task_utils,
    link_repo::{self, LinkEntity},
    project_repo::{activity_logs, helpers as repo_helpers, mutation, query, ProjectRepo},
    tag_repo::{self, TagEntity},
    task_repo::TaskRepo,
};
use crate::types::{dto::ProjectDto, error::AppError};
pub use dto::{ProjectCreateInput, ProjectUpdateInput, ProjectUpdatePatch};
use helpers::{is_default_project_id, priority_to_string};

pub struct ProjectService;

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
