use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpaceDto {
    pub id: String,
    pub name: String,
    pub order: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
pub struct TaskDto {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub note: Option<String>,
    /// todo / done
    pub status: String,
    /// completed / cancelled（仅 status=done 时有效）
    pub done_reason: Option<String>,
    pub priority: String,  // P0, P1, P2, P3
    pub tags: Vec<String>, // 从 task_tags JOIN 获取
    pub rank: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub completed_at: Option<i64>,
    /// 截止日期（时间戳毫秒）
    pub deadline_at: Option<i64>,
    /// 归档时间（时间戳毫秒）
    pub archived_at: Option<i64>,
    /// 软删除时间（时间戳毫秒）
    pub deleted_at: Option<i64>,
    /// 外部链接列表
    pub links: Vec<String>,
    /// 自定义字段
    pub custom_fields: Option<CustomFieldsDto>,
    /// 创建者
    pub create_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomFieldsDto {
    pub fields: Vec<CustomFieldItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomFieldItemDto {
    pub key: String,
    pub label: String,
    pub value: Option<String>,
}
