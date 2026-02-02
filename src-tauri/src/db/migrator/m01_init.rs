use sea_orm::{DbErr, Schema};
use sea_orm_migration::prelude::*;

use crate::db::entities::{
    app_settings, links, project_links, project_tags, projects, spaces, tags, task_links,
    task_tags, tasks,
};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let builder = manager.get_database_backend();
        let schema = Schema::new(builder);

        // 定义创建顺序 (先创建被依赖的表)
        // Spaces -> Projects -> Tasks
        // Tags, Links 独立
        // 关联表 (Junctions) 最后

        manager
            .create_table(
                schema
                    .create_table_from_entity(app_settings::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                schema
                    .create_table_from_entity(spaces::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                schema
                    .create_table_from_entity(projects::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                sea_orm_migration::prelude::Index::create()
                    .if_not_exists()
                    .name("idx_projects_space_id")
                    .table(projects::Entity)
                    .col(projects::Column::SpaceId)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                sea_orm_migration::prelude::Index::create()
                    .if_not_exists()
                    .name("idx_projects_parent_id")
                    .table(projects::Entity)
                    .col(projects::Column::ParentId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                schema
                    .create_table_from_entity(tags::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                schema
                    .create_table_from_entity(links::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                schema
                    .create_table_from_entity(tasks::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                sea_orm_migration::prelude::Index::create()
                    .if_not_exists()
                    .name("idx_tasks_status")
                    .table(tasks::Entity)
                    .col(tasks::Column::Status)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                sea_orm_migration::prelude::Index::create()
                    .if_not_exists()
                    .name("idx_tasks_space_id")
                    .table(tasks::Entity)
                    .col(tasks::Column::SpaceId)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                sea_orm_migration::prelude::Index::create()
                    .if_not_exists()
                    .name("idx_tasks_project_id")
                    .table(tasks::Entity)
                    .col(tasks::Column::ProjectId)
                    .to_owned(),
            )
            .await?;

        // 关联表
        manager
            .create_table(
                schema
                    .create_table_from_entity(task_tags::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                schema
                    .create_table_from_entity(project_tags::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                schema
                    .create_table_from_entity(task_links::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                schema
                    .create_table_from_entity(project_links::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 逆序删除
        manager
            .drop_table(Table::drop().table(project_links::Entity).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(task_links::Entity).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(project_tags::Entity).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(task_tags::Entity).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(tasks::Entity).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(links::Entity).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(tags::Entity).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(projects::Entity).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(spaces::Entity).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(app_settings::Entity).to_owned())
            .await?;

        Ok(())
    }
}
