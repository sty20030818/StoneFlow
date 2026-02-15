//! Task 活动日志仓储。
//!
//! 重点：
//! - `append` 用于任务动作写入（与业务事务同提交）
//! - `list` 提供查询接口（按 task/space/project/time 过滤）

use std::collections::{HashMap, HashSet};

use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, QuerySelect, Set,
};
use uuid::Uuid;

use crate::db::entities::{projects, task_activity_logs};
use crate::types::{dto::ActivityLogDto, error::AppError};

pub struct ActivityLogRepo;

#[derive(Debug, Clone)]
pub struct NewTaskActivityLogInput {
    pub task_id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub action: String,
    pub action_label: String,
    pub field_key: Option<String>,
    pub field_label: Option<String>,
    pub before_value: Option<String>,
    pub after_value: Option<String>,
    pub detail: String,
    pub create_by: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Default)]
pub struct ListActivityLogsInput {
    pub entity_type: Option<String>,
    pub task_id: Option<String>,
    pub space_id: Option<String>,
    pub project_id: Option<String>,
    pub from: Option<i64>,
    pub to: Option<i64>,
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

const DEFAULT_LIST_LIMIT: u64 = 100;
const MAX_LIST_LIMIT: u64 = 500;

impl ActivityLogRepo {
    pub async fn append<C>(conn: &C, input: NewTaskActivityLogInput) -> Result<(), AppError>
    where
        C: ConnectionTrait,
    {
        let model = task_activity_logs::ActiveModel {
            id: Set(Uuid::new_v4().to_string()),
            task_id: Set(input.task_id),
            space_id: Set(input.space_id),
            project_id: Set(input.project_id),
            action: Set(input.action),
            action_label: Set(input.action_label),
            field_key: Set(input.field_key),
            field_label: Set(input.field_label),
            before_value: Set(input.before_value),
            after_value: Set(input.after_value),
            detail: Set(input.detail),
            create_by: Set(input.create_by),
            created_at: Set(input.created_at),
        };

        model.insert(conn).await.map_err(AppError::from)?;
        Ok(())
    }

    pub async fn list(
        conn: &DatabaseConnection,
        input: ListActivityLogsInput,
    ) -> Result<Vec<ActivityLogDto>, AppError> {
        if let Some(entity_type) = input.entity_type.as_deref() {
            if entity_type != "task" {
                return Ok(Vec::new());
            }
        }

        let mut query = task_activity_logs::Entity::find();

        if let Some(task_id) = input.task_id.as_deref() {
            query = query.filter(task_activity_logs::Column::TaskId.eq(task_id));
        }

        if let Some(space_id) = input.space_id.as_deref() {
            query = query.filter(task_activity_logs::Column::SpaceId.eq(space_id));
        }

        if let Some(project_id) = input.project_id.as_deref() {
            query = query.filter(task_activity_logs::Column::ProjectId.eq(project_id));
        }

        if let Some(from) = input.from {
            query = query.filter(task_activity_logs::Column::CreatedAt.gte(from));
        }

        if let Some(to) = input.to {
            query = query.filter(task_activity_logs::Column::CreatedAt.lte(to));
        }

        let limit = input.limit.unwrap_or(DEFAULT_LIST_LIMIT).min(MAX_LIST_LIMIT);
        let offset = input.offset.unwrap_or(0);

        let logs = query
            .order_by_desc(task_activity_logs::Column::CreatedAt)
            .limit(limit)
            .offset(offset)
            .all(conn)
            .await
            .map_err(AppError::from)?;

        let project_ids: HashSet<String> = logs.iter().filter_map(|x| x.project_id.clone()).collect();
        let mut project_name_map: HashMap<String, String> = HashMap::new();

        if !project_ids.is_empty() {
            let project_models = projects::Entity::find()
                .filter(projects::Column::Id.is_in(project_ids))
                .all(conn)
                .await
                .map_err(AppError::from)?;
            for project in project_models {
                project_name_map.insert(project.id, project.title);
            }
        }

        let items = logs
            .into_iter()
            .map(|model| {
                let project_name = match model.project_id.as_deref() {
                    Some(pid) => project_name_map
                        .get(pid)
                        .cloned()
                        .unwrap_or_else(|| pid.to_string()),
                    None => "当前 Space 默认 Project".to_string(),
                };

                ActivityLogDto {
                    id: model.id,
                    entity_type: "task".to_string(),
                    entity_id: model.task_id,
                    action: model.action,
                    action_label: model.action_label,
                    field_key: model.field_key,
                    field_label: model.field_label,
                    before_value: model.before_value,
                    after_value: model.after_value,
                    detail: model.detail,
                    created_at: model.created_at,
                    space_id: model.space_id,
                    project_id: model.project_id,
                    project_name,
                }
            })
            .collect();

        Ok(items)
    }
}
