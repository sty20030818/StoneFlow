//! SeaORM Entity for project activity logs.

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "project_activity_logs")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub project_id: String,
    pub space_id: String,
    pub action: String,
    pub action_label: String,
    pub field_key: Option<String>,
    pub field_label: Option<String>,
    pub before_value: Option<String>,
    pub after_value: Option<String>,
    pub detail: String,
    pub create_by: String,
    pub created_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::projects::Entity",
        from = "Column::ProjectId",
        to = "super::projects::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Projects,
}

impl Related<super::projects::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Projects.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
