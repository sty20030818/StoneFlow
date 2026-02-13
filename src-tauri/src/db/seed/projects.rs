//! 默认 Project seed + 历史任务回填。
//! 重点：每个 Space 保证存在一个 default project，旧任务自动补齐 project_id。

use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    Set, TransactionTrait,
};

use crate::db::entities::{projects, sea_orm_active_enums::Priority, spaces, tasks};
use crate::db::now_ms;
use crate::repos::task_repo::stats;
use crate::types::error::AppError;

pub async fn seed_default_projects_and_backfill_tasks(
    conn: &DatabaseConnection,
) -> Result<(), AppError> {
    // 前置条件：迁移已完成，相关表都存在。

    let now = now_ms();
    // 重点：创建默认项目 + 回填任务 + 刷新统计应在同一事务中完成。
    let txn = conn.begin().await.map_err(AppError::from)?;

    let spaces_list = spaces::Entity::find()
        .all(&txn)
        .await
        .map_err(AppError::from)?;

    for space in spaces_list {
        let space_id = space.id;
        let project_id = format!("{space_id}_default");

        let exists = projects::Entity::find_by_id(&project_id)
            .count(&txn)
            .await
            .map_err(AppError::from)?
            > 0;

        if !exists {
            let project_title = "未归类".to_string();
            let path = "/未归类".to_string();

            let active = projects::ActiveModel {
                id: Set(project_id.clone()),
                space_id: Set(space_id.clone()),
                parent_id: Set(None),
                path: Set(path),
                title: Set(project_title),
                note: Set(None),
                priority: Set(Priority::P1),
                todo_task_count: Set(0),
                done_task_count: Set(0),
                last_task_updated_at: Set(None),
                created_at: Set(now),
                updated_at: Set(now),
                archived_at: Set(None),
                deleted_at: Set(None),
                create_by: Set("stonefish".to_string()),
                rank: Set(1024),
            };
            active.insert(&txn).await.map_err(AppError::from)?;
        }

        // 回填：把未归属项目的任务挂到默认项目下。
        tasks::Entity::update_many()
            .col_expr(
                tasks::Column::ProjectId,
                sea_orm::sea_query::Expr::value(project_id.clone()),
            )
            .filter(tasks::Column::SpaceId.eq(&space_id))
            .filter(tasks::Column::ProjectId.is_null())
            .exec(&txn)
            .await
            .map_err(AppError::from)?;

        // 刷新默认项目统计，保证 UI 显示一致。
        stats::refresh_project_stats(&txn, &project_id, now).await?;
    }

    txn.commit().await.map_err(AppError::from)?;
    Ok(())
}
