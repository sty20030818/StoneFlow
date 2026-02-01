use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Text")]
pub enum Priority {
    #[sea_orm(string_value = "P0")]
    P0,
    #[sea_orm(string_value = "P1")]
    P1,
    #[sea_orm(string_value = "P2")]
    P2,
    #[sea_orm(string_value = "P3")]
    P3,
}

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Text")]
pub enum TaskStatus {
    #[sea_orm(string_value = "todo")]
    Todo,
    #[sea_orm(string_value = "done")]
    Done,
}

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Text")]
pub enum DoneReason {
    #[sea_orm(string_value = "completed")]
    Completed,
    #[sea_orm(string_value = "cancelled")]
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Text")]
pub enum LinkKind {
    #[sea_orm(string_value = "doc")]
    Doc,
    #[sea_orm(string_value = "repoLocal")]
    RepoLocal,
    #[sea_orm(string_value = "repoRemote")]
    RepoRemote,
    #[sea_orm(string_value = "web")]
    Web,
    #[sea_orm(string_value = "design")]
    Design,
    #[sea_orm(string_value = "other")]
    Other,
}
