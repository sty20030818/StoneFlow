use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceDto {
    pub id: String,
    pub name: String,
    pub order: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectDto {
  pub id: String,
  pub space_id: String,
  pub parent_id: Option<String>,
  pub path: String,
  pub name: String,
  pub note: Option<String>,
  pub status: String,
  pub created_at: i64,
  pub updated_at: i64,
  pub archived_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskDto {
    pub id: String,
    pub space_id: String,
    pub title: String,
    /// todo / doing / done / archived
    pub status: String,
    pub order_in_list: i64,
    pub created_at: i64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
}
