//! ProjectRepo 的活动日志写入辅助。

use sea_orm::ConnectionTrait;

use crate::repos::activity_log_repo::{ActivityLogRepo, NewProjectActivityLogInput};
use crate::types::error::AppError;

const ACTION_PROJECT_CREATED: &str = "project_created";
const ACTION_PROJECT_DELETED: &str = "project_deleted";
const ACTION_PROJECT_RESTORED: &str = "project_restored";
const ACTION_PROJECT_ARCHIVED: &str = "project_archived";
const ACTION_PROJECT_UNARCHIVED: &str = "project_unarchived";
const ACTION_PROJECT_FIELD_UPDATED: &str = "project_field_updated";

#[derive(Debug, Clone)]
pub struct ProjectLogCtx<'a> {
    pub project_id: &'a str,
    pub space_id: &'a str,
    pub create_by: &'a str,
    pub created_at: i64,
}

pub async fn append_created<C>(
    conn: &C,
    ctx: ProjectLogCtx<'_>,
    title: &str,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append_project(
        conn,
        NewProjectActivityLogInput {
            project_id: ctx.project_id.to_string(),
            space_id: ctx.space_id.to_string(),
            action: ACTION_PROJECT_CREATED.to_string(),
            action_label: "创建项目".to_string(),
            field_key: None,
            field_label: None,
            before_value: None,
            after_value: None,
            detail: format!("创建项目「{}」", title),
            create_by: ctx.create_by.to_string(),
            created_at: ctx.created_at,
        },
    )
    .await
}

pub async fn append_deleted<C>(
    conn: &C,
    ctx: ProjectLogCtx<'_>,
    title: &str,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append_project(
        conn,
        NewProjectActivityLogInput {
            project_id: ctx.project_id.to_string(),
            space_id: ctx.space_id.to_string(),
            action: ACTION_PROJECT_DELETED.to_string(),
            action_label: "删除项目".to_string(),
            field_key: Some("deletedAt".to_string()),
            field_label: Some("删除时间".to_string()),
            before_value: None,
            after_value: Some(ctx.created_at.to_string()),
            detail: format!("删除项目「{}」", title),
            create_by: ctx.create_by.to_string(),
            created_at: ctx.created_at,
        },
    )
    .await
}

pub async fn append_restored<C>(
    conn: &C,
    ctx: ProjectLogCtx<'_>,
    title: &str,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append_project(
        conn,
        NewProjectActivityLogInput {
            project_id: ctx.project_id.to_string(),
            space_id: ctx.space_id.to_string(),
            action: ACTION_PROJECT_RESTORED.to_string(),
            action_label: "恢复项目".to_string(),
            field_key: Some("deletedAt".to_string()),
            field_label: Some("删除时间".to_string()),
            before_value: None,
            after_value: None,
            detail: format!("恢复项目「{}」", title),
            create_by: ctx.create_by.to_string(),
            created_at: ctx.created_at,
        },
    )
    .await
}

pub async fn append_archived<C>(
    conn: &C,
    ctx: ProjectLogCtx<'_>,
    title: &str,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append_project(
        conn,
        NewProjectActivityLogInput {
            project_id: ctx.project_id.to_string(),
            space_id: ctx.space_id.to_string(),
            action: ACTION_PROJECT_ARCHIVED.to_string(),
            action_label: "归档项目".to_string(),
            field_key: Some("archivedAt".to_string()),
            field_label: Some("归档时间".to_string()),
            before_value: None,
            after_value: Some(ctx.created_at.to_string()),
            detail: format!("归档项目「{}」", title),
            create_by: ctx.create_by.to_string(),
            created_at: ctx.created_at,
        },
    )
    .await
}

pub async fn append_unarchived<C>(
    conn: &C,
    ctx: ProjectLogCtx<'_>,
    title: &str,
) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append_project(
        conn,
        NewProjectActivityLogInput {
            project_id: ctx.project_id.to_string(),
            space_id: ctx.space_id.to_string(),
            action: ACTION_PROJECT_UNARCHIVED.to_string(),
            action_label: "取消归档".to_string(),
            field_key: Some("archivedAt".to_string()),
            field_label: Some("归档时间".to_string()),
            before_value: None,
            after_value: None,
            detail: format!("取消归档项目「{}」", title),
            create_by: ctx.create_by.to_string(),
            created_at: ctx.created_at,
        },
    )
    .await
}

pub async fn append_field_updated<C>(
    conn: &C,
    ctx: ProjectLogCtx<'_>,
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

    ActivityLogRepo::append_project(
        conn,
        NewProjectActivityLogInput {
            project_id: ctx.project_id.to_string(),
            space_id: ctx.space_id.to_string(),
            action: ACTION_PROJECT_FIELD_UPDATED.to_string(),
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
