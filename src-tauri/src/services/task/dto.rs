use crate::types::dto::{CustomFieldsDto, LinkInputDto};

#[derive(Debug, Clone, Default)]
pub struct TaskCreatePatch {
    pub status: Option<String>,
    pub done_reason: Option<String>,
    pub priority: Option<String>,
    pub note: Option<String>,
    pub deadline_at: Option<i64>,
    pub tags: Option<Vec<String>>,
    pub links: Option<Vec<LinkInputDto>>,
    pub custom_fields: Option<CustomFieldsDto>,
}

#[derive(Debug, Clone)]
pub struct TaskCreateInput {
    pub space_id: String,
    pub title: String,
    pub auto_start: bool,
    pub project_id: Option<String>,
    pub patch: TaskCreatePatch,
}

#[derive(Debug, Clone)]
pub struct TaskUpdateInput {
    pub id: String,
    pub patch: TaskUpdatePatch,
}

#[derive(Debug, Clone, Default)]
pub struct TaskUpdatePatch {
    pub title: Option<String>,
    pub status: Option<String>,
    pub done_reason: Option<Option<String>>,
    pub priority: Option<String>,
    pub note: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub space_id: Option<String>,
    pub project_id: Option<Option<String>>,
    pub deadline_at: Option<Option<i64>>,
    pub rank: Option<i64>,
    pub links: Option<Vec<LinkInputDto>>,
    pub custom_fields: Option<Option<CustomFieldsDto>>,
    pub archived_at: Option<Option<i64>>,
    pub deleted_at: Option<Option<i64>>,
}

impl TaskUpdatePatch {
    pub fn rank_only(new_rank: i64) -> Self {
        Self {
            rank: Some(new_rank),
            ..Self::default()
        }
    }
}
