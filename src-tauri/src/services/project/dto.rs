use crate::types::dto::LinkInputDto;

#[derive(Debug, Clone)]
pub struct ProjectCreateInput {
    pub space_id: String,
    pub title: String,
    pub parent_id: Option<String>,
    pub note: Option<String>,
    pub priority: Option<String>,
    pub rank: Option<i64>,
    pub tags: Option<Vec<String>>,
    pub links: Option<Vec<LinkInputDto>>,
}

#[derive(Debug, Clone)]
pub struct ProjectUpdateInput {
    pub project_id: String,
    pub patch: ProjectUpdatePatch,
}

#[derive(Debug, Clone, Default)]
pub struct ProjectUpdatePatch {
    pub title: Option<String>,
    pub note: Option<Option<String>>,
    pub priority: Option<String>,
    pub space_id: Option<String>,
    pub parent_id: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub links: Option<Vec<LinkInputDto>>,
}
