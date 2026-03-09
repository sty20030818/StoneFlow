use crate::db::entities::sea_orm_active_enums::Priority;

pub fn is_default_project_id(project_id: &str) -> bool {
    project_id.ends_with("_default")
}

pub fn priority_to_string(priority: &Priority) -> String {
    match priority {
        Priority::P0 => "P0",
        Priority::P1 => "P1",
        Priority::P2 => "P2",
        Priority::P3 => "P3",
    }
    .to_string()
}
