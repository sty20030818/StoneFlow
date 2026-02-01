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
    // Assuming tables exist because migrations ran.

    let now = now_ms();
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
            let project_title = "Default Project".to_string();
            let path = "/Default Project".to_string();

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

        // Backfill tasks: update tasks set project_id = default where space_id = X and project_id is NULL
        // SeaORM update many is explicit
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

        // Refresh stats
        stats::refresh_project_stats(&txn, &project_id, now).await?;
    }

    txn.commit().await.map_err(AppError::from)?;
    Ok(())
}
