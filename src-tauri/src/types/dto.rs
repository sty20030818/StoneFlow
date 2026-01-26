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
  pub priority: String,
  pub created_at: i64,
  pub updated_at: i64,
  pub archived_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskDto {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub note: Option<String>,
    /// todo / doing / done / archived
    pub status: String,
    pub priority: String, // P0, P1, P2, P3
    pub tags: Vec<String>, // 从 task_tags JOIN 获取
    pub order_in_list: i64,
    pub created_at: i64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub planned_start_at: Option<i64>,
    pub planned_end_at: Option<i64>,
}
