use crate::db::entities::sea_orm_active_enums::Priority;
use crate::types::error::AppError;

/// 解析优先级字符串为枚举，支持不区分大小写。
/// 默认为 P1。
pub fn parse_priority(priority: Option<&str>) -> Result<Priority, AppError> {
    match priority.unwrap_or("P1").trim().to_uppercase().as_str() {
        "P0" => Ok(Priority::P0),
        "P1" => Ok(Priority::P1),
        "P2" => Ok(Priority::P2),
        "P3" => Ok(Priority::P3),
        _ => Err(AppError::Validation(
            "优先级必须是 P0, P1, P2 或 P3".to_string(),
        )),
    }
}

pub fn normalize_priority(priority: &str) -> String {
    priority.trim().to_uppercase()
}

pub fn validate_priority(priority: &str) -> Result<(), AppError> {
    // 简单校验，不分配内存
    let p = priority.trim();
    if p.eq_ignore_ascii_case("P0")
        || p.eq_ignore_ascii_case("P1")
        || p.eq_ignore_ascii_case("P2")
        || p.eq_ignore_ascii_case("P3")
    {
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
