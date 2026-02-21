//! Project 仓储（项目聚合根）。
//!
//! 学习要点：
//! - DTO 聚合填充（links/tags）
//! - 创建时默认 rank 计算
//! - 读写逻辑与事务边界分离

use sea_orm::{
    prelude::Expr, ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait,
    QueryFilter, QueryOrder, Set, TransactionTrait,
};
use std::collections::{HashMap, HashSet, VecDeque};
use uuid::Uuid;

use crate::db::entities::{projects, sea_orm_active_enums::Priority};
use crate::db::now_ms;
use crate::repos::{
    common_task_utils,
    link_repo::{self, LinkEntity},
    tag_repo::{self, TagEntity},
};
use crate::types::{
    dto::{LinkInputDto, ProjectDto},
    error::AppError,
};

pub mod helpers;

pub struct ProjectRepo;

/// 创建项目所需输入。
/// 重点：把参数打包成结构体，避免函数签名过长。
#[derive(Debug, Clone)]
pub struct ProjectCreateInput {
    pub space_id: String,
    pub title: String,
    pub parent_id: Option<String>,
    pub note: Option<String>,
    pub priority: Option<String>,
    pub rank: Option<i64>,
    pub tags: Option<Vec<String>>,
    pub links: Option<Vec<LinkInputDto>>,
}

#[derive(Debug, Clone)]
pub struct ProjectUpdateInput {
    pub project_id: String,
    pub patch: ProjectUpdatePatch,
}

#[derive(Debug, Clone, Default)]
pub struct ProjectUpdatePatch {
    pub title: Option<String>,
    pub note: Option<Option<String>>,
    pub priority: Option<String>,
    pub parent_id: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub links: Option<Vec<LinkInputDto>>,
}

const DEFAULT_PROJECT_ID_SUFFIX: &str = "_default";

fn is_default_project_id(project_id: &str) -> bool {
    project_id.ends_with(DEFAULT_PROJECT_ID_SUFFIX)
}

impl ProjectRepo {
    /// 收集目标项目与其全部后代项目 ID（仅在同一 Space 内递归）。
    ///
    /// 重点：
    /// - 该函数只负责“递归收集”，不执行删除写入
    /// - 可被删除编排复用，避免查询逻辑重复
    pub async fn collect_subtree_ids<C>(conn: &C, project_id: &str) -> Result<Vec<String>, AppError>
    where
        C: ConnectionTrait,
    {
        let root_model = projects::Entity::find_by_id(project_id)
            .one(conn)
            .await
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::Validation(format!("项目 {} 不存在", project_id)))?;

        let all_projects = projects::Entity::find()
            .filter(projects::Column::SpaceId.eq(root_model.space_id))
            .all(conn)
            .await
            .map_err(AppError::from)?;

        Ok(Self::collect_descendant_ids(project_id, &all_projects))
    }

    /// 根据项目 ID 集合执行软删除（不负责递归收集）。
    ///
    /// 重点：
    /// - 删除动作独立封装，便于命令层按事务编排调用
    /// - 只更新未删除记录，避免重复写入
    pub async fn soft_delete_by_ids<C>(
        conn: &C,
        project_ids: &[String],
        now: i64,
    ) -> Result<usize, AppError>
    where
        C: ConnectionTrait,
    {
        if project_ids.is_empty() {
            return Ok(0);
        }

        let mut unique_project_ids = project_ids.to_vec();
        unique_project_ids.sort();
        unique_project_ids.dedup();

        let res = projects::Entity::update_many()
            .col_expr(projects::Column::DeletedAt, Expr::value(Some(now)))
            .col_expr(projects::Column::UpdatedAt, Expr::value(now))
            .filter(projects::Column::Id.is_in(unique_project_ids))
            .filter(projects::Column::DeletedAt.is_null())
            .exec(conn)
            .await
            .map_err(AppError::from)?;

        Ok(res.rows_affected as usize)
    }

    /// 内部工具：在已加载的同空间项目集合中，按 BFS 收集“根 + 全部后代”。
    fn collect_descendant_ids(
        root_project_id: &str,
        all_projects: &[projects::Model],
    ) -> Vec<String> {
        let mut children_by_parent: HashMap<Option<String>, Vec<String>> = HashMap::new();
        for project in all_projects {
            children_by_parent
                .entry(project.parent_id.clone())
                .or_default()
                .push(project.id.clone());
        }

        let mut queue = VecDeque::from([root_project_id.to_string()]);
        let mut visited = HashSet::new();
        let mut subtree_ids = Vec::new();

        while let Some(current_id) = queue.pop_front() {
            if !visited.insert(current_id.clone()) {
                continue;
            }

            subtree_ids.push(current_id.clone());

            if let Some(children) = children_by_parent.get(&Some(current_id)) {
                for child_id in children {
                    queue.push_back(child_id.clone());
                }
            }
        }

        subtree_ids
    }

    /// 列出某个 Space 下的所有 Project，按 rank ASC → created_at ASC 排序。
    pub async fn list_by_space(
        conn: &DatabaseConnection,
        space_id: &str,
    ) -> Result<Vec<ProjectDto>, AppError> {
        let models = projects::Entity::find()
            .filter(projects::Column::SpaceId.eq(space_id))
            .filter(projects::Column::DeletedAt.is_null())
            .order_by_asc(projects::Column::Rank)
            .order_by_asc(projects::Column::CreatedAt)
            .all(conn)
            .await
            .map_err(AppError::from)?;

        let mut dtos = Vec::with_capacity(models.len());
        for m in models {
            dtos.push(model_to_dto(m));
        }

        helpers::attach_links(conn, &mut dtos).await?;
        helpers::attach_tags(conn, &mut dtos).await?;

        Ok(dtos)
    }

    /// 列出某个 Space 下的已软删除 Project。
    pub async fn list_deleted_by_space(
        conn: &DatabaseConnection,
        space_id: &str,
    ) -> Result<Vec<ProjectDto>, AppError> {
        let models = projects::Entity::find()
            .filter(projects::Column::SpaceId.eq(space_id))
            .filter(projects::Column::DeletedAt.is_not_null())
            .order_by_desc(projects::Column::DeletedAt)
            .order_by_desc(projects::Column::CreatedAt)
            .all(conn)
            .await
            .map_err(AppError::from)?;

        let mut dtos = Vec::with_capacity(models.len());
        for m in models {
            dtos.push(model_to_dto(m));
        }

        helpers::attach_links(conn, &mut dtos).await?;
        helpers::attach_tags(conn, &mut dtos).await?;

        Ok(dtos)
    }

    /// 获取默认 Project（每个 Space 都有一个名为 "{SpaceName} · Default" 的默认项目）。
    pub async fn get_default_project(
        conn: &DatabaseConnection,
        space_id: &str,
    ) -> Result<ProjectDto, AppError> {
        let default_id = format!("{space_id}_default");

        let model = projects::Entity::find_by_id(&default_id)
            .one(conn)
            .await
            .map_err(AppError::from)?;

        match model {
            Some(m) => {
                let mut dto = model_to_dto(m);
                helpers::attach_links(conn, std::slice::from_mut(&mut dto)).await?;
                helpers::attach_tags(conn, std::slice::from_mut(&mut dto)).await?;
                Ok(dto)
            }
            None => Err(AppError::Validation(format!(
                "Default project for space '{}' not found. Please ensure database is properly initialized.",
                space_id
            ))),
        }
    }

    /// 创建新项目。
    pub async fn create(
        conn: &DatabaseConnection,
        input: ProjectCreateInput,
    ) -> Result<ProjectDto, AppError> {
        let ProjectCreateInput {
            space_id,
            title,
            parent_id,
            note,
            priority,
            rank,
            tags,
            links,
        } = input;

        let title = title.trim();
        if title.is_empty() {
            return Err(AppError::Validation("项目名称不能为空".to_string()));
        }
        let note = note.as_deref().and_then(|v| {
            let trimmed = v.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        });
        let tags = tags.unwrap_or_default();
        let links = links.unwrap_or_default();

        // 重点：先规范化与校验输入，再进入数据库写入阶段。
        let priority_enum = common_task_utils::parse_priority(priority.as_deref())?;

        let path =
            helpers::build_project_path(conn, &space_id, parent_id.as_deref(), title).await?;

        let now = now_ms();
        let id = Uuid::new_v4().to_string();

        // 新项目默认插在同层级“末尾”。
        let mut rank_query = projects::Entity::find()
            .filter(projects::Column::SpaceId.eq(space_id.clone()))
            .filter(projects::Column::DeletedAt.is_null());
        if let Some(pid) = parent_id.as_deref() {
            rank_query = rank_query.filter(projects::Column::ParentId.eq(pid));
        } else {
            rank_query = rank_query.filter(projects::Column::ParentId.is_null());
        }

        let max_rank_project = rank_query
            .order_by_desc(projects::Column::Rank)
            .one(conn)
            .await
            .map_err(AppError::from)?;

        let default_rank = max_rank_project.map(|p| p.rank + 1024).unwrap_or(1024);
        let resolved_rank = rank.unwrap_or(default_rank);

        let active_model = projects::ActiveModel {
            id: Set(id.clone()),
            space_id: Set(space_id),
            parent_id: Set(parent_id),
            path: Set(path.clone()),
            title: Set(title.to_string()),
            note: Set(note),
            priority: Set(priority_enum),
            todo_task_count: Set(0),
            done_task_count: Set(0),
            last_task_updated_at: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
            archived_at: Set(None),
            deleted_at: Set(None),
            create_by: Set("stonefish".to_string()),
            rank: Set(resolved_rank),
        };

        // 重点：项目本体 + 标签 + 链接必须在一个事务里保持一致。
        let txn = conn.begin().await.map_err(AppError::from)?;
        let res = active_model.insert(&txn).await.map_err(AppError::from)?;

        if !tags.is_empty() {
            tag_repo::sync_tags(&txn, TagEntity::Project, &id, &tags, now).await?;
        }
        if !links.is_empty() {
            link_repo::sync_links(&txn, LinkEntity::Project, &id, &links).await?;
        }

        txn.commit().await.map_err(AppError::from)?;

        let mut dto = model_to_dto(res);
        helpers::attach_links(conn, std::slice::from_mut(&mut dto)).await?;
        helpers::attach_tags(conn, std::slice::from_mut(&mut dto)).await?;
        Ok(dto)
    }

    /// 更新项目元数据（标题、备注、优先级、父级、标签、链接）。
    pub async fn update(
        conn: &DatabaseConnection,
        input: ProjectUpdateInput,
    ) -> Result<(), AppError> {
        let ProjectUpdateInput { project_id, patch } = input;
        let ProjectUpdatePatch {
            title,
            note,
            priority,
            parent_id,
            tags,
            links,
        } = patch;

        let txn = conn.begin().await.map_err(AppError::from)?;
        let model = projects::Entity::find_by_id(project_id.as_str())
            .one(&txn)
            .await
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::Validation(format!("项目 {} 不存在", project_id)))?;

        if is_default_project_id(project_id.as_str()) && (title.is_some() || parent_id.is_some()) {
            return Err(AppError::Validation(
                "默认项目不允许修改标题或父级".to_string(),
            ));
        }

        let now = now_ms();
        let old_path = model.path.clone();
        let old_title = model.title.clone();
        let old_parent_id = model.parent_id.clone();

        let mut next_title = old_title.clone();
        let mut next_parent_id = old_parent_id.clone();
        let mut changed_any = false;
        let mut path_changed = false;
        let mut next_path = old_path.clone();

        let mut active_model: projects::ActiveModel = model.clone().into();

        if tags.is_some() || links.is_some() {
            changed_any = true;
        }

        if let Some(next_title_input) = title.as_deref() {
            let normalized_title = next_title_input.trim();
            if normalized_title.is_empty() {
                return Err(AppError::Validation("项目名称不能为空".to_string()));
            }
            if normalized_title != old_title {
                next_title = normalized_title.to_string();
                active_model.title = Set(next_title.clone());
                changed_any = true;
            }
        }

        if let Some(note_opt) = note {
            let normalized_note = note_opt.and_then(|value| {
                let trimmed = value.trim();
                if trimmed.is_empty() {
                    None
                } else {
                    Some(trimmed.to_string())
                }
            });
            if normalized_note != model.note {
                active_model.note = Set(normalized_note);
                changed_any = true;
            }
        }

        if let Some(priority_value) = priority.as_deref() {
            let parsed_priority = common_task_utils::parse_priority(Some(priority_value))?;
            if parsed_priority != model.priority {
                active_model.priority = Set(parsed_priority);
                changed_any = true;
            }
        }

        if let Some(next_parent_input) = parent_id {
            if let Some(parent_candidate_id) = next_parent_input.as_deref() {
                if parent_candidate_id == project_id {
                    return Err(AppError::Validation("项目不能挂载到自身".to_string()));
                }

                let subtree_ids = Self::collect_subtree_ids(&txn, project_id.as_str()).await?;
                if subtree_ids.iter().any(|id| id == parent_candidate_id) {
                    return Err(AppError::Validation("项目不能挂载到自身后代".to_string()));
                }
            }

            if next_parent_input != old_parent_id {
                next_parent_id = next_parent_input;
                active_model.parent_id = Set(next_parent_id.clone());
                changed_any = true;
            }
        }

        if next_title != old_title || next_parent_id != old_parent_id {
            let rebuilt_path = helpers::build_project_path(
                &txn,
                &model.space_id,
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
        active_model.update(&txn).await.map_err(AppError::from)?;

        if let Some(tags_input) = tags.as_ref() {
            tag_repo::sync_tags(
                &txn,
                TagEntity::Project,
                project_id.as_str(),
                tags_input,
                now,
            )
            .await?;
        }
        if let Some(links_input) = links.as_ref() {
            link_repo::sync_links(&txn, LinkEntity::Project, project_id.as_str(), links_input)
                .await?;
        }

        if path_changed {
            Self::rebase_descendant_paths(&txn, &model.space_id, &old_path, &next_path, now)
                .await?;
        }

        txn.commit().await.map_err(AppError::from)?;
        Ok(())
    }

    /// 更新项目的 rank 和可选的 parentId（用于拖拽排序）。
    pub async fn reorder(
        conn: &DatabaseConnection,
        project_id: &str,
        new_rank: i64,
        new_parent_id: Option<Option<&str>>,
    ) -> Result<(), AppError> {
        let txn = conn.begin().await.map_err(AppError::from)?;
        let model = projects::Entity::find_by_id(project_id)
            .one(&txn)
            .await
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::Validation(format!("项目 {} 不存在", project_id)))?;

        let now = now_ms();
        let old_path = model.path.clone();
        let old_parent_id = model.parent_id.clone();
        let target_parent_id = new_parent_id.map(|value| value.map(|s| s.to_string()));
        let mut path_changed = false;
        let mut next_path = old_path.clone();

        let mut active_model: projects::ActiveModel = model.clone().into();
        active_model.rank = Set(new_rank);
        active_model.updated_at = Set(now);

        if let Some(parent_id) = target_parent_id {
            active_model.parent_id = Set(parent_id.clone());
            if old_parent_id != parent_id {
                next_path = helpers::build_project_path(
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

        active_model.update(&txn).await.map_err(AppError::from)?;

        if path_changed {
            Self::rebase_descendant_paths(&txn, &model.space_id, &old_path, &next_path, now)
                .await?;
        }

        txn.commit().await.map_err(AppError::from)?;
        Ok(())
    }

    async fn rebase_descendant_paths<C>(
        conn: &C,
        space_id: &str,
        old_root_path: &str,
        new_root_path: &str,
        now: i64,
    ) -> Result<(), AppError>
    where
        C: ConnectionTrait,
    {
        if old_root_path == new_root_path {
            return Ok(());
        }

        let old_prefix = format!("{old_root_path}/");
        let descendants = projects::Entity::find()
            .filter(projects::Column::SpaceId.eq(space_id))
            .filter(projects::Column::Path.starts_with(old_prefix))
            .all(conn)
            .await
            .map_err(AppError::from)?;

        for model in descendants {
            let suffix = model
                .path
                .strip_prefix(old_root_path)
                .unwrap_or("")
                .to_string();
            let mut active_model: projects::ActiveModel = model.into();
            active_model.path = Set(format!("{new_root_path}{suffix}"));
            active_model.updated_at = Set(now);
            active_model.update(conn).await.map_err(AppError::from)?;
        }

        Ok(())
    }

    /// 批量重排项目 rank。
    pub async fn rebalance_ranks(
        conn: &DatabaseConnection,
        project_ids: &[String],
        step: i64,
    ) -> Result<(), AppError> {
        let now = now_ms();
        for (index, project_id) in project_ids.iter().enumerate() {
            let new_rank = (index as i64) * step;
            let model = projects::Entity::find_by_id(project_id)
                .one(conn)
                .await
                .map_err(AppError::from)?;

            if let Some(m) = model {
                let mut active_model: projects::ActiveModel = m.into();
                active_model.rank = Set(new_rank);
                active_model.updated_at = Set(now);
                active_model.update(conn).await.map_err(AppError::from)?;
            }
        }
        Ok(())
    }

    /// 恢复软删除项目（仅当前节点，不递归恢复子项目）。
    pub async fn restore(conn: &DatabaseConnection, project_id: &str) -> Result<(), AppError> {
        let model = projects::Entity::find_by_id(project_id)
            .one(conn)
            .await
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::Validation(format!("项目 {} 不存在", project_id)))?;

        // 产品约束：恢复逻辑保持单节点恢复，不自动恢复后代。
        let now = now_ms();
        let mut active_model: projects::ActiveModel = model.into();
        active_model.deleted_at = Set(None);
        active_model.updated_at = Set(now);
        active_model.update(conn).await.map_err(AppError::from)?;
        Ok(())
    }
}

fn model_to_dto(m: projects::Model) -> ProjectDto {
    // 重点：computed_status 是展示层派生值，不单独落库。
    let computed_status = helpers::compute_status(
        m.deleted_at,
        m.archived_at,
        m.todo_task_count,
        m.done_task_count,
    );

    let priority_string = match m.priority {
        Priority::P0 => "P0",
        Priority::P1 => "P1",
        Priority::P2 => "P2",
        Priority::P3 => "P3",
    }
    .to_string();

    ProjectDto {
        id: m.id,
        space_id: m.space_id,
        parent_id: m.parent_id,
        path: m.path,
        title: m.title,
        note: m.note,
        priority: priority_string,
        todo_task_count: m.todo_task_count,
        done_task_count: m.done_task_count,
        last_task_updated_at: m.last_task_updated_at,
        created_at: m.created_at,
        updated_at: m.updated_at,
        archived_at: m.archived_at,
        deleted_at: m.deleted_at,
        create_by: m.create_by,
        rank: m.rank,
        computed_status,
        tags: Vec::new(),
        links: Vec::new(),
    }
}
