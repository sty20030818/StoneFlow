//! TaskRepo 的活动日志写入辅助。

use sea_orm::ConnectionTrait;

use crate::repos::activity_log_repo::{ActivityLogRepo, NewTaskActivityLogInput};
use crate::types::error::AppError;

const ACTION_TASK_CREATED: &str = "task_created";
const ACTION_TASK_COMPLETED: &str = "task_completed";
const ACTION_TASK_DELETED: &str = "task_deleted";
const ACTION_TASK_RESTORED: &str = "task_restored";
const ACTION_TASK_FIELD_UPDATED: &str = "task_field_updated";

/// 任务活动日志写入时需要的公共上下文。
#[derive(Debug, Clone)]
pub struct TaskLogCtx<'a> {
    pub task_id: &'a str,
    pub space_id: &'a str,
    pub project_id: Option<&'a str>,
    pub create_by: &'a str,
    pub created_at: i64,
}

/// 把可选项目 id 转成日志输入结构需要的 `Option<String>`。
fn project_id_string(project_id: Option<&str>) -> Option<String> {
    project_id.map(|x| x.to_string())
}

/// 追加“任务创建”日志。
pub async fn append_created<C>(conn: &C, ctx: TaskLogCtx<'_>, title: &str) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append_task(
        conn,
        NewTaskActivityLogInput {
            task_id: ctx.task_id.to_string(),
            space_id: ctx.space_id.to_string(),
            project_id: project_id_string(ctx.project_id),
            action: ACTION_TASK_CREATED.to_string(),
            action_label: "创建任务".to_string(),
            field_key: None,
            field_label: None,
            before_value: None,
            after_value: None,
            detail: format!("创建任务「{}」", title),
            create_by: ctx.create_by.to_string(),
            created_at: ctx.created_at,
        },
    )
    .await
}

/// 追加“任务完成”日志。
pub async fn append_completed<C>(conn: &C, ctx: TaskLogCtx<'_>, title: &str) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append_task(
        conn,
        NewTaskActivityLogInput {
            task_id: ctx.task_id.to_string(),
            space_id: ctx.space_id.to_string(),
            project_id: project_id_string(ctx.project_id),
            action: ACTION_TASK_COMPLETED.to_string(),
            action_label: "完成任务".to_string(),
            field_key: Some("status".to_string()),
            field_label: Some("状态".to_string()),
            before_value: None,
            after_value: Some("done".to_string()),
            detail: format!("完成任务「{}」", title),
            create_by: ctx.create_by.to_string(),
            created_at: ctx.created_at,
        },
    )
    .await
}

/// 追加“任务删除”日志。
pub async fn append_deleted<C>(conn: &C, ctx: TaskLogCtx<'_>, title: &str) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append_task(
        conn,
        NewTaskActivityLogInput {
            task_id: ctx.task_id.to_string(),
            space_id: ctx.space_id.to_string(),
            project_id: project_id_string(ctx.project_id),
            action: ACTION_TASK_DELETED.to_string(),
            action_label: "删除任务".to_string(),
            field_key: Some("deletedAt".to_string()),
            field_label: Some("删除时间".to_string()),
            before_value: None,
            after_value: Some(ctx.created_at.to_string()),
            detail: format!("删除任务「{}」", title),
            create_by: ctx.create_by.to_string(),
            created_at: ctx.created_at,
        },
    )
    .await
}

/// 追加“任务恢复”日志。
pub async fn append_restored<C>(conn: &C, ctx: TaskLogCtx<'_>, title: &str) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append_task(
        conn,
        NewTaskActivityLogInput {
            task_id: ctx.task_id.to_string(),
            space_id: ctx.space_id.to_string(),
            project_id: project_id_string(ctx.project_id),
            action: ACTION_TASK_RESTORED.to_string(),
            action_label: "恢复任务".to_string(),
            field_key: Some("deletedAt".to_string()),
            field_label: Some("删除时间".to_string()),
            before_value: None,
            after_value: None,
            detail: format!("恢复任务「{}」", title),
            create_by: ctx.create_by.to_string(),
            created_at: ctx.created_at,
        },
    )
    .await
}

/// 追加字段级更新日志。
///
/// 如果前后值相同，会直接跳过，避免产生噪声日志。
pub async fn append_field_updated<C>(
    conn: &C,
    ctx: TaskLogCtx<'_>,
    field_key: &str,
    field_label: &str,
    before_value: Option<String>,
    after_value: Option<String>,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    if before_value == after_value {
        return Ok(());
    }

    let before_text = before_value.clone().unwrap_or_else(|| "空".to_string());
    let after_text = after_value.clone().unwrap_or_else(|| "空".to_string());

    ActivityLogRepo::append_task(
        conn,
        NewTaskActivityLogInput {
            task_id: ctx.task_id.to_string(),
            space_id: ctx.space_id.to_string(),
            project_id: project_id_string(ctx.project_id),
            action: ACTION_TASK_FIELD_UPDATED.to_string(),
            action_label: "字段更新".to_string(),
            field_key: Some(field_key.to_string()),
            field_label: Some(field_label.to_string()),
            before_value,
            after_value,
            detail: format!(
                "{} 从「{}」更新为「{}」",
                field_label, before_text, after_text
            ),
            create_by: ctx.create_by.to_string(),
            created_at: ctx.created_at,
        },
    )
    .await
}
