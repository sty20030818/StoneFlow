use sea_orm::{ConnectionTrait, EntityTrait};

use crate::db::entities::{
    projects,
    sea_orm_active_enums::{DoneReason, Priority},
};
use crate::types::dto::LinkInputDto;
use crate::types::error::AppError;

/// 把优先级枚举转成前端日志展示使用的字符串。
pub(super) fn priority_to_value(priority: &Priority) -> String {
    match priority {
        Priority::P0 => "P0",
        Priority::P1 => "P1",
        Priority::P2 => "P2",
        Priority::P3 => "P3",
    }
    .to_string()
}

/// 把完成原因枚举转换成可序列化字符串。
pub(super) fn done_reason_to_value(done_reason: &Option<DoneReason>) -> Option<String> {
    done_reason.as_ref().map(|value| match value {
        DoneReason::Completed => "completed".to_string(),
        DoneReason::Cancelled => "cancelled".to_string(),
    })
}

/// 归一化标签列表：去空、去重、保留原始顺序。
pub(super) fn normalize_tags(values: Vec<String>) -> Vec<String> {
    let mut normalized = Vec::new();
    for value in values {
        let tag = value.trim();
        if tag.is_empty() || normalized.iter().any(|item: &String| item == tag) {
            continue;
        }
        normalized.push(tag.to_string());
    }
    normalized
}

/// 为活动日志准备标签字符串，规则与创建/更新时保持一致。
pub(super) fn normalize_tags_for_log(tags: &[String]) -> Vec<String> {
    let mut normalized = Vec::new();
    for tag in tags {
        let value = tag.trim();
        if value.is_empty() || normalized.iter().any(|item: &String| item == value) {
            continue;
        }
        normalized.push(value.to_string());
    }
    normalized
}

/// 把一条链接格式化成日志里稳定展示的文本。
pub(super) fn format_link_for_log(kind: &str, title: &str, url: &str) -> String {
    format!("{}:{}<{}>", kind, title.trim(), url.trim())
}

/// 批量格式化链接，供字段级日志比对使用。
pub(super) fn normalize_links_for_log(links: &[LinkInputDto]) -> Vec<String> {
    links
        .iter()
        .map(|item| format_link_for_log(item.kind.as_str(), item.title.as_str(), item.url.as_str()))
        .collect()
}

/// 把字符串列表按给定分隔符拼接成可选值，空列表返回 `None`。
pub(super) fn to_optional_join(values: Vec<String>, separator: &str) -> Option<String> {
    if values.is_empty() {
        None
    } else {
        Some(values.join(separator))
    }
}

/// 去重项目 id，避免一次变更重复刷新同一个项目统计。
pub(super) fn dedup_project_ids(mut project_ids: Vec<String>) -> Vec<String> {
    project_ids.sort();
    project_ids.dedup();
    project_ids
}

/// 解析某个 Space 的默认项目 ID，并确保默认项目已存在。
pub(super) async fn resolve_default_project_id<C>(
    conn: &C,
    space_id: &str,
) -> Result<String, AppError>
where
    C: ConnectionTrait,
{
    let default_project_id = format!("{space_id}_default");
    let exists = projects::Entity::find_by_id(&default_project_id)
        .one(conn)
        .await
        .map_err(AppError::from)?;

    if exists.is_some() {
        Ok(default_project_id)
    } else {
        Err(AppError::Validation(format!(
            "Space '{}' 缺少默认项目，无法为任务兜底归类",
            space_id
        )))
    }
}
