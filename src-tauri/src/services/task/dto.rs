//! Task service 输入模型。
//!
//! 这些类型是 service 层自己的“用例输入”，
//! 不是前端命令参数，也不是 repo 落库结构。

use crate::types::dto::{CustomFieldsDto, LinkInputDto};

/// 创建任务时允许附带的补丁字段。
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

/// 创建任务用例的完整输入。
#[derive(Debug, Clone)]
pub struct TaskCreateInput {
    pub space_id: String,
    pub title: String,
    pub auto_start: bool,
    pub project_id: Option<String>,
    pub patch: TaskCreatePatch,
}

/// 更新任务用例的完整输入。
#[derive(Debug, Clone)]
pub struct TaskUpdateInput {
    pub id: String,
    pub patch: TaskUpdatePatch,
}

/// 任务 patch 更新模型。
///
/// 这里大量使用 `Option<Option<T>>`：
/// - `None`：调用方没有传这个字段
/// - `Some(None)`：显式清空这个字段
/// - `Some(Some(v))`：显式设置为新值
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
    /// 只更新 rank 的快捷构造器，供排序用例复用。
    pub fn rank_only(new_rank: i64) -> Self {
        Self {
            rank: Some(new_rank),
            ..Self::default()
        }
    }
}
