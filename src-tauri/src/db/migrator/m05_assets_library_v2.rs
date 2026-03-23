//! 资产库 V2：新增四类资产正式持久化表。

use sea_orm::{DbErr, Schema};
use sea_orm_migration::prelude::*;

use crate::db::entities::{
    asset_diary_entries, asset_notes, asset_snippets, asset_vault_entries,
};

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
                    .create_table_from_entity(asset_snippets::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_snippets_updated_at")
                    .table(asset_snippets::Entity)
                    .col(asset_snippets::Column::UpdatedAt)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_snippets_language")
                    .table(asset_snippets::Entity)
                    .col(asset_snippets::Column::Language)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                schema
                    .create_table_from_entity(asset_notes::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_notes_updated_at")
                    .table(asset_notes::Entity)
                    .col(asset_notes::Column::UpdatedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                schema
                    .create_table_from_entity(asset_diary_entries::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_diary_entries_date")
                    .table(asset_diary_entries::Entity)
                    .col(asset_diary_entries::Column::Date)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_diary_entries_updated_at")
                    .table(asset_diary_entries::Entity)
                    .col(asset_diary_entries::Column::UpdatedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                schema
                    .create_table_from_entity(asset_vault_entries::Entity)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_vault_entries_updated_at")
                    .table(asset_vault_entries::Entity)
                    .col(asset_vault_entries::Column::UpdatedAt)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_vault_entries_secret_type")
                    .table(asset_vault_entries::Entity)
                    .col(asset_vault_entries::Column::SecretType)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(asset_vault_entries::Entity).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(asset_diary_entries::Entity).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(asset_notes::Entity).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(asset_snippets::Entity).to_owned())
            .await?;

        Ok(())
    }
}
