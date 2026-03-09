use crate::db::entities::sea_orm_active_enums::Priority;

/// 判断一个项目是否是系统默认项目。
pub(super) fn is_default_project_id(project_id: &str) -> bool {
    project_id.ends_with("_default")
}

/// 把项目优先级枚举转成活动日志使用的字符串。
pub(super) fn priority_to_string(priority: &Priority) -> String {
    match priority {
        Priority::P0 => "P0",
        Priority::P1 => "P1",
        Priority::P2 => "P2",
        Priority::P3 => "P3",
    }
    .to_string()
}
