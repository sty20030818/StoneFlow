use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "asset_diary_entries")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub date: String,
    pub title: String,
    pub subtitle: Option<String>,
    #[sea_orm(column_type = "Text")]
    pub content: String,
    #[sea_orm(column_type = "Text")]
    pub tags: String,
    pub favorite: bool,
    #[sea_orm(column_type = "Text")]
    pub linked_task_ids: String,
    pub linked_project_id: Option<String>,
    pub sync_state: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
