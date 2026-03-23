use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "asset_snippets")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub title: String,
    pub language: String,
    #[sea_orm(column_type = "Text")]
    pub content: String,
    pub description: Option<String>,
    pub folder: Option<String>,
    #[sea_orm(column_type = "Text")]
    pub tags: String,
    pub favorite: bool,
    pub linked_task_id: Option<String>,
    pub linked_project_id: Option<String>,
    pub sync_state: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
