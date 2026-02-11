//! Task 创建逻辑。
//! 重点：创建时默认状态为 todo、默认优先级为 P1，并计算末尾 rank。

use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};
use uuid::Uuid;

use crate::db::entities::{
    sea_orm_active_enums::{Priority, TaskStatus},
    tasks,
};
use crate::db::now_ms;
use crate::types::{dto::TaskDto, error::AppError};

use super::{activity_logs, stats, validations};

pub async fn create(
    conn: &DatabaseConnection,
    space_id: &str,
    title: &str,
    auto_start: bool,
    project_id: Option<&str>,
) -> Result<TaskDto, AppError> {
    let txn = conn.begin().await.map_err(AppError::from)?;

    let title = validations::trim_and_validate_title(title)?;

    let now = now_ms();
    let id = Uuid::new_v4().to_string();
    let _auto_start = auto_start;
    let status = TaskStatus::Todo;
    let priority = Priority::P1;

    // 重点：读取同分组最大 rank，把新任务插到“列表底部”。
    let max_rank_task = tasks::Entity::find()
        .filter(tasks::Column::SpaceId.eq(space_id))
        .filter(tasks::Column::Status.eq(status.clone()))
        .filter(tasks::Column::Priority.eq(priority.clone()))
        .filter(tasks::Column::DeletedAt.is_null())
        .order_by_desc(tasks::Column::Rank)
        .one(&txn)
        .await
        .map_err(AppError::from)?;

    let rank = max_rank_task.map(|t| t.rank + 1024).unwrap_or(1024);

    let updated_at = now;
    let create_by = "stonefish";

    let active_model = tasks::ActiveModel {
        id: Set(id.clone()),
        space_id: Set(space_id.to_string()),
        project_id: Set(project_id.map(|s| s.to_string())),
        title: Set(title.clone()),
        note: Set(None),
        status: Set(status.clone()),
        done_reason: Set(None),
        priority: Set(priority),
        rank: Set(rank),
        created_at: Set(now),
        updated_at: Set(updated_at),
        completed_at: Set(None),
        deadline_at: Set(None),
        archived_at: Set(None),
        deleted_at: Set(None),
        custom_fields: Set(None),
        create_by: Set(create_by.to_string()),
    };

    active_model.insert(&txn).await.map_err(AppError::from)?;

    activity_logs::append_created(
        &txn,
        activity_logs::TaskLogCtx {
            task_id: &id,
            space_id,
            project_id,
            create_by,
            created_at: now,
        },
        &title,
    )
    .await?;

    if let Some(project_id) = project_id {
        stats::refresh_project_stats(&txn, project_id, now).await?;
    }

    txn.commit().await.map_err(AppError::from)?;

    Ok(TaskDto {
        id,
        space_id: space_id.to_string(),
        project_id: project_id.map(|s| s.to_string()),
        title,
        note: None,
        status: "todo".to_string(), // Map enum to string
        done_reason: None,
        priority: "P1".to_string(),
        tags: Vec::new(),
        rank,
        created_at: now,
        updated_at,
        completed_at: None,
        deadline_at: None,
        archived_at: None,
        deleted_at: None,
        links: Vec::new(),
        custom_fields: None,
        create_by: create_by.to_string(),
    })
}
