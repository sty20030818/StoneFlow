//! 为关系表补充同步版本字段与 tombstone 字段。
//!
//! 重点：
//! - `updated_at` 用于增量同步和冲突保护
//! - `deleted_at` 用于删除传播，避免关系表只能补新增不能删

use sea_orm::{ConnectionTrait, DbBackend, Statement};
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let now = chrono::Utc::now().timestamp_millis();

        add_relation_tracking_columns(manager, "task_tags").await?;
        add_relation_tracking_columns(manager, "task_links").await?;
        add_relation_tracking_columns(manager, "project_tags").await?;
        add_relation_tracking_columns(manager, "project_links").await?;

        backfill_updated_at(manager, "task_tags", now).await?;
        backfill_updated_at(manager, "task_links", now).await?;
        backfill_updated_at(manager, "project_tags", now).await?;
        backfill_updated_at(manager, "project_links", now).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        drop_relation_tracking_columns(manager, "task_tags").await?;
        drop_relation_tracking_columns(manager, "task_links").await?;
        drop_relation_tracking_columns(manager, "project_tags").await?;
        drop_relation_tracking_columns(manager, "project_links").await?;
        Ok(())
    }
}

async fn add_relation_tracking_columns(
    manager: &SchemaManager<'_>,
    table_name: &str,
) -> Result<(), DbErr> {
    if !manager.has_column(table_name, "updated_at").await? {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new(table_name))
                    .add_column(
                        ColumnDef::new(Alias::new("updated_at"))
                            .big_integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await?;
    }

    if !manager.has_column(table_name, "deleted_at").await? {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new(table_name))
                    .add_column(ColumnDef::new(Alias::new("deleted_at")).big_integer().null())
                    .to_owned(),
            )
            .await?;
    }

    Ok(())
}

async fn drop_relation_tracking_columns(
    manager: &SchemaManager<'_>,
    table_name: &str,
) -> Result<(), DbErr> {
    if manager.has_column(table_name, "deleted_at").await? {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new(table_name))
                    .drop_column(Alias::new("deleted_at"))
                    .to_owned(),
            )
            .await?;
    }

    if manager.has_column(table_name, "updated_at").await? {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new(table_name))
                    .drop_column(Alias::new("updated_at"))
                    .to_owned(),
            )
            .await?;
    }

    Ok(())
}

async fn backfill_updated_at(
    manager: &SchemaManager<'_>,
    table_name: &str,
    now: i64,
) -> Result<(), DbErr> {
    let backend = manager.get_database_backend();
    let statement = match backend {
        DbBackend::Sqlite | DbBackend::Postgres => Statement::from_string(
            backend,
            format!("UPDATE {table_name} SET updated_at = {now} WHERE updated_at = 0"),
        ),
        _ => Statement::from_string(
            backend,
            format!("UPDATE {table_name} SET updated_at = {now} WHERE updated_at = 0"),
        ),
    };
    manager.get_connection().execute(statement).await?;
    Ok(())
}
