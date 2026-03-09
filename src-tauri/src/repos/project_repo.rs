//! Project 仓储入口。
//!
//! 最终态职责：
//! - 暴露项目查询能力
//! - 暴露供 service 组合的项目树辅助能力
//! - 通过子模块提供主表 mutation / query / helper 原语
//! - 不再承载完整写用例与事务编排

use sea_orm::{ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder};
use std::collections::{HashMap, HashSet, VecDeque};

use crate::db::entities::projects;
use crate::types::{dto::ProjectDto, error::AppError};

pub mod activity_logs;
pub mod helpers;
pub mod mutation;
pub mod query;

pub struct ProjectRepo;

impl ProjectRepo {
    /// 收集目标项目与其全部后代项目 ID（仅在同一 Space 内递归）。
    ///
    /// 重点：
    /// - 该函数只负责“递归收集”，不执行删除写入
    /// - 可被 service 的删除编排复用，避免查询逻辑重复
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

    /// 列出某个 Space 下的所有 Project，按 rank ASC -> created_at ASC 排序。
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
        for model in models {
            dtos.push(helpers::project_model_to_dto(model));
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
        for model in models {
            dtos.push(helpers::project_model_to_dto(model));
        }

        helpers::attach_links(conn, &mut dtos).await?;
        helpers::attach_tags(conn, &mut dtos).await?;

        Ok(dtos)
    }

    /// 获取默认 Project（每个 Space 都有一个固定 default 项目）。
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
            Some(model) => {
                let mut dto = helpers::project_model_to_dto(model);
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
}
