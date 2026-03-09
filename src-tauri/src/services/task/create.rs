//! 任务创建用例。
//!
//! 这个文件负责把“创建任务”涉及的默认值、输入归一化、
//! 初始排序、标签/链接写入和活动日志放进同一个事务里完成。

use sea_orm::{DatabaseConnection, TransactionTrait};
use uuid::Uuid;

use crate::db::{
    entities::sea_orm_active_enums::{DoneReason, Priority, TaskStatus},
    now_ms,
};
use crate::repos::task_repo::{
    activity_logs, custom_fields, links, mutation, query, stats, tags, validations,
};
use crate::types::{dto::TaskDto, error::AppError};

use super::{dto::TaskCreateInput, helpers::normalize_tags, TaskService};

impl TaskService {
    /// 创建任务并返回创建后的 DTO。
    ///
    /// 这里会在一个事务里完成：
    /// - 标题与 patch 输入归一化
    /// - 主表插入
    /// - 标签 / 链接 / 自定义字段落库
    /// - 活动日志与项目统计刷新
    pub async fn create(
        conn: &DatabaseConnection,
        input: TaskCreateInput,
    ) -> Result<TaskDto, AppError> {
        let txn = conn.begin().await.map_err(AppError::from)?;
        let patch = input.patch;
        let title = validations::trim_and_validate_title(&input.title)?;

        let now = now_ms();
        let id = Uuid::new_v4().to_string();
        let _auto_start = input.auto_start;
        // 创建时允许通过 patch 指定初始状态；未指定则默认 todo。
        let status = match patch.status.as_deref() {
            Some(status) => match validations::normalize_status(status)?.as_str() {
                "done" => TaskStatus::Done,
                _ => TaskStatus::Todo,
            },
            None => TaskStatus::Todo,
        };
        let done_reason = if status == TaskStatus::Done {
            let reason = patch.done_reason.as_deref().unwrap_or("completed");
            let reason = validations::normalize_done_reason(reason)?;
            Some(match reason.as_str() {
                "cancelled" => DoneReason::Cancelled,
                _ => DoneReason::Completed,
            })
        } else {
            None
        };
        // 优先级同样在 service 内做最终归一化，避免 repo 感知前端字符串。
        let priority = match patch.priority.as_deref() {
            Some(priority) => match validations::normalize_priority(priority)?.as_str() {
                "P0" => Priority::P0,
                "P2" => Priority::P2,
                "P3" => Priority::P3,
                _ => Priority::P1,
            },
            None => Priority::P1,
        };
        let note = patch
            .note
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string);
        let deadline_at = patch.deadline_at;
        let normalized_tags = normalize_tags(patch.tags.unwrap_or_default());
        let normalized_links = patch.links.unwrap_or_default();
        let normalized_custom_fields = patch
            .custom_fields
            .map(custom_fields::normalize_custom_fields)
            .transpose()?;
        let custom_fields_json = normalized_custom_fields
            .as_ref()
            .map(custom_fields::serialize_custom_fields)
            .transpose()?;
        let rank = query::next_rank_in_bucket(&txn, &input.space_id, &status, &priority).await?;
        let create_by = "stonefish".to_string();

        // 主表先插入，后面标签、链接和日志都依赖新任务 id。
        let task = mutation::insert(
            &txn,
            mutation::NewTaskRecord {
                id: id.clone(),
                space_id: input.space_id.clone(),
                project_id: input.project_id.clone(),
                title: title.clone(),
                note: note.clone(),
                status: status.clone(),
                done_reason: done_reason.clone(),
                priority: priority.clone(),
                rank,
                created_at: now,
                updated_at: now,
                completed_at: done_reason.as_ref().map(|_| now),
                deadline_at,
                archived_at: None,
                deleted_at: None,
                custom_fields: custom_fields_json,
                create_by: create_by.clone(),
            },
        )
        .await?;

        if !normalized_tags.is_empty() {
            tags::sync_tags(&txn, &id, &normalized_tags).await?;
        }
        if !normalized_links.is_empty() {
            links::sync_links(&txn, &id, &normalized_links).await?;
        }

        activity_logs::append_created(
            &txn,
            activity_logs::TaskLogCtx {
                task_id: &task.id,
                space_id: &task.space_id,
                project_id: task.project_id.as_deref(),
                create_by: &task.create_by,
                created_at: now,
            },
            &task.title,
        )
        .await?;

        if let Some(project_id) = task.project_id.as_deref() {
            stats::refresh_project_stats(&txn, project_id, now).await?;
        }

        txn.commit().await.map_err(AppError::from)?;

        // 返回前组装成前端可直接消费的 DTO，避免命令层二次拼装。
        Ok(TaskDto {
            id: task.id,
            space_id: task.space_id,
            project_id: task.project_id,
            title: task.title,
            note,
            status: match status {
                TaskStatus::Done => "done".to_string(),
                TaskStatus::Todo => "todo".to_string(),
            },
            done_reason: done_reason.as_ref().map(|value| match value {
                DoneReason::Completed => "completed".to_string(),
                DoneReason::Cancelled => "cancelled".to_string(),
            }),
            priority: match priority {
                Priority::P0 => "P0".to_string(),
                Priority::P1 => "P1".to_string(),
                Priority::P2 => "P2".to_string(),
                Priority::P3 => "P3".to_string(),
            },
            tags: normalized_tags,
            links: Vec::new(),
            rank,
            created_at: now,
            updated_at: now,
            completed_at: done_reason.as_ref().map(|_| now),
            deadline_at,
            archived_at: None,
            deleted_at: None,
            custom_fields: normalized_custom_fields,
            create_by,
        })
    }
}
