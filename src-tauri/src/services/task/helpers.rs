use crate::db::entities::sea_orm_active_enums::{DoneReason, Priority};
use crate::types::dto::LinkInputDto;

pub(super) fn priority_to_value(priority: &Priority) -> String {
    match priority {
        Priority::P0 => "P0",
        Priority::P1 => "P1",
        Priority::P2 => "P2",
        Priority::P3 => "P3",
    }
    .to_string()
}

pub(super) fn done_reason_to_value(done_reason: &Option<DoneReason>) -> Option<String> {
    done_reason.as_ref().map(|value| match value {
        DoneReason::Completed => "completed".to_string(),
        DoneReason::Cancelled => "cancelled".to_string(),
    })
}

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

pub(super) fn format_link_for_log(kind: &str, title: &str, url: &str) -> String {
    format!("{}:{}<{}>", kind, title.trim(), url.trim())
}

pub(super) fn normalize_links_for_log(links: &[LinkInputDto]) -> Vec<String> {
    links
        .iter()
        .map(|item| format_link_for_log(item.kind.as_str(), item.title.as_str(), item.url.as_str()))
        .collect()
}

pub(super) fn to_optional_join(values: Vec<String>, separator: &str) -> Option<String> {
    if values.is_empty() {
        None
    } else {
        Some(values.join(separator))
    }
}

pub(super) fn dedup_project_ids(mut project_ids: Vec<String>) -> Vec<String> {
    project_ids.sort();
    project_ids.dedup();
    project_ids
}
