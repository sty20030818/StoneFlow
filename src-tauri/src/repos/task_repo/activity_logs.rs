//! TaskRepo 的活动日志写入辅助。

use sea_orm::ConnectionTrait;

use crate::repos::activity_log_repo::{ActivityLogRepo, NewTaskActivityLogInput};
use crate::types::error::AppError;

const ACTION_TASK_CREATED: &str = "task_created";
const ACTION_TASK_COMPLETED: &str = "task_completed";
const ACTION_TASK_DELETED: &str = "task_deleted";
const ACTION_TASK_RESTORED: &str = "task_restored";
const ACTION_TASK_FIELD_UPDATED: &str = "task_field_updated";

#[derive(Debug, Clone)]
pub struct TaskLogCtx<'a> {
    pub task_id: &'a str,
    pub space_id: &'a str,
    pub project_id: Option<&'a str>,
    pub create_by: &'a str,
    pub created_at: i64,
}

fn project_id_string(project_id: Option<&str>) -> Option<String> {
    project_id.map(|x| x.to_string())
}

pub async fn append_created<C>(conn: &C, ctx: TaskLogCtx<'_>, title: &str) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append(
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

pub async fn append_completed<C>(conn: &C, ctx: TaskLogCtx<'_>, title: &str) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append(
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

pub async fn append_deleted<C>(conn: &C, ctx: TaskLogCtx<'_>, title: &str) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append(
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

pub async fn append_restored<C>(conn: &C, ctx: TaskLogCtx<'_>, title: &str) -> Result<(), AppError>
where
    C: ConnectionTrait,
{
    ActivityLogRepo::append(
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

    ActivityLogRepo::append(
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
            detail: format!("{} 从「{}」更新为「{}」", field_label, before_text, after_text),
            create_by: ctx.create_by.to_string(),
            created_at: ctx.created_at,
        },
    )
    .await
}

#[cfg(test)]
mod tests {
    use sea_orm::{ActiveModelTrait, Database, DatabaseConnection, Set};
    use sea_orm_migration::MigratorTrait;

    use crate::db::entities::{
        sea_orm_active_enums::{Priority, TaskStatus},
        spaces, tasks,
    };
    use crate::db::migrator::Migrator;
    use crate::repos::activity_log_repo::{ActivityLogRepo, ListActivityLogsInput};

    use super::{append_created, append_field_updated, TaskLogCtx};

    async fn setup_db() -> DatabaseConnection {
        let conn = Database::connect("sqlite::memory:")
            .await
            .expect("connect sqlite memory");
        Migrator::up(&conn, None).await.expect("run migrations");
        conn
    }

    async fn seed_task(conn: &DatabaseConnection, task_id: &str) {
        spaces::ActiveModel {
            id: Set("inbox".to_string()),
            name: Set("Inbox".to_string()),
            order: Set(0),
            created_at: Set(1),
            updated_at: Set(1),
        }
        .insert(conn)
        .await
        .ok();

        tasks::ActiveModel {
            id: Set(task_id.to_string()),
            space_id: Set("inbox".to_string()),
            project_id: Set(None),
            title: Set("Test Task".to_string()),
            note: Set(None),
            status: Set(TaskStatus::Todo),
            done_reason: Set(None),
            priority: Set(Priority::P1),
            rank: Set(1024),
            created_at: Set(1),
            updated_at: Set(1),
            completed_at: Set(None),
            deadline_at: Set(None),
            archived_at: Set(None),
            deleted_at: Set(None),
            custom_fields: Set(None),
            create_by: Set("stonefish".to_string()),
        }
        .insert(conn)
        .await
        .expect("insert task");
    }

    #[tokio::test]
    async fn should_create_field_update_log_when_value_changed() {
        let conn = setup_db().await;
        seed_task(&conn, "task-1").await;

        append_field_updated(
            &conn,
            TaskLogCtx {
                task_id: "task-1",
                space_id: "inbox",
                project_id: None,
                create_by: "stonefish",
                created_at: 10,
            },
            "priority",
            "优先级",
            Some("P1".to_string()),
            Some("P0".to_string()),
        )
        .await
        .expect("append field update log");

        let items = ActivityLogRepo::list(
            &conn,
            ListActivityLogsInput {
                task_id: Some("task-1".to_string()),
                ..Default::default()
            },
        )
        .await
        .expect("list logs by task");

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].action, "task_field_updated");
        assert_eq!(items[0].field_key.as_deref(), Some("priority"));
        assert_eq!(items[0].before_value.as_deref(), Some("P1"));
        assert_eq!(items[0].after_value.as_deref(), Some("P0"));
    }

    #[tokio::test]
    async fn should_not_create_log_when_field_value_unchanged() {
        let conn = setup_db().await;
        seed_task(&conn, "task-1").await;

        append_field_updated(
            &conn,
            TaskLogCtx {
                task_id: "task-1",
                space_id: "inbox",
                project_id: None,
                create_by: "stonefish",
                created_at: 10,
            },
            "priority",
            "优先级",
            Some("P1".to_string()),
            Some("P1".to_string()),
        )
        .await
        .expect("append unchanged field update");

        let items = ActivityLogRepo::list(
            &conn,
            ListActivityLogsInput {
                task_id: Some("task-1".to_string()),
                ..Default::default()
            },
        )
        .await
        .expect("list logs by task");

        assert!(items.is_empty());
    }

    #[tokio::test]
    async fn should_filter_logs_by_task_id() {
        let conn = setup_db().await;
        seed_task(&conn, "task-1").await;
        seed_task(&conn, "task-2").await;

        append_created(
            &conn,
            TaskLogCtx {
                task_id: "task-1",
                space_id: "inbox",
                project_id: None,
                create_by: "stonefish",
                created_at: 10,
            },
            "Task 1",
        )
        .await
        .expect("append task 1 log");

        append_created(
            &conn,
            TaskLogCtx {
                task_id: "task-2",
                space_id: "inbox",
                project_id: None,
                create_by: "stonefish",
                created_at: 20,
            },
            "Task 2",
        )
        .await
        .expect("append task 2 log");

        let items = ActivityLogRepo::list(
            &conn,
            ListActivityLogsInput {
                task_id: Some("task-1".to_string()),
                ..Default::default()
            },
        )
        .await
        .expect("list logs by task");

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].entity_id, "task-1");
        assert_eq!(items[0].action, "task_created");
    }
}
