use crate::repos::common_task_utils;
use crate::types::error::AppError;

pub fn trim_and_validate_title(title: &str) -> Result<String, AppError> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        Err(AppError::Validation("任务标题不能为空".to_string()))
    } else {
        Ok(trimmed.to_string())
    }
}

pub fn normalize_status(status: &str) -> Result<String, AppError> {
    common_task_utils::validate_status(status)
}

pub fn normalize_done_reason(reason: &str) -> Result<String, AppError> {
    common_task_utils::normalize_done_reason(reason)
}

pub fn require_done_reason(done_reason: Option<Option<&str>>) -> Result<String, AppError> {
    let reason = done_reason
        .ok_or_else(|| AppError::Validation("完成任务时必须提供 doneReason".to_string()))?
        .ok_or_else(|| AppError::Validation("完成任务时必须提供 doneReason".to_string()))?;
    normalize_done_reason(reason)
}

pub fn normalize_priority(priority: &str) -> Result<String, AppError> {
    let normalized = common_task_utils::normalize_priority(priority);
    common_task_utils::validate_priority(&normalized)?;
    Ok(normalized)
}
