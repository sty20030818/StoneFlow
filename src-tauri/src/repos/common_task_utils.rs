use crate::types::error::AppError;

pub fn normalize_priority(priority: &str) -> String {
    priority.trim().to_uppercase()
}

pub fn validate_priority(priority: &str) -> Result<(), AppError> {
    let normalized = normalize_priority(priority);
    if matches!(normalized.as_str(), "P0" | "P1" | "P2" | "P3") {
        Ok(())
    } else {
        Err(AppError::Validation(
            "优先级必须是 P0, P1, P2 或 P3".to_string(),
        ))
    }
}

pub fn normalize_status(status: &str) -> String {
    status.trim().to_lowercase()
}

pub fn validate_status(status: &str) -> Result<String, AppError> {
    let normalized = normalize_status(status);
    if normalized == "todo" || normalized == "done" {
        Ok(normalized)
    } else {
        Err(AppError::Validation("状态必须为 todo 或 done".to_string()))
    }
}

pub fn normalize_done_reason(reason: &str) -> Result<String, AppError> {
    let normalized = reason.trim().to_lowercase();
    if normalized == "completed" || normalized == "cancelled" {
        Ok(normalized)
    } else {
        Err(AppError::Validation(
            "doneReason 必须为 completed 或 cancelled".to_string(),
        ))
    }
}
