//! Project service 输入模型。
//!
//! 这些结构体位于 service 边界，用来表达项目写用例需要的输入语义。

use crate::types::dto::LinkInputDto;

/// 创建项目用例的输入。
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

/// 更新项目用例的输入。
#[derive(Debug, Clone)]
pub struct ProjectUpdateInput {
    pub project_id: String,
    pub patch: ProjectUpdatePatch,
}

/// 项目 patch 更新模型。
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
