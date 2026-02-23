//! 第三个迁移：新增项目操作日志表。

use sea_orm::{DbErr, Schema};
use sea_orm_migration::prelude::*;

use crate::db::entities::project_activity_logs;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let builder = manager.get_database_backend();
        let schema = Schema::new(builder);

        manager
            .create_table(
                schema
                    .create_table_from_entity(project_activity_logs::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_project_activity_logs_project_created_at")
                    .table(project_activity_logs::Entity)
                    .col(project_activity_logs::Column::ProjectId)
                    .col(project_activity_logs::Column::CreatedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_project_activity_logs_space_created_at")
                    .table(project_activity_logs::Entity)
                    .col(project_activity_logs::Column::SpaceId)
                    .col(project_activity_logs::Column::CreatedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(project_activity_logs::Entity)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}
