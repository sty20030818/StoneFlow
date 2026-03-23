use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "asset_vault_entries")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub name: String,
    pub secret_type: String,
    pub environment: Option<String>,
    #[sea_orm(column_type = "Text")]
    pub value: String,
    pub folder: Option<String>,
    pub note: Option<String>,
    #[sea_orm(column_type = "Text")]
    pub tags: String,
    pub favorite: bool,
    pub sync_state: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
