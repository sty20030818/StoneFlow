use tauri::State;

use crate::db::DbState;
use crate::repos::space_repo::SpaceRepo;
use crate::types::{dto::SpaceDto, error::ApiError};

#[tauri::command]
pub async fn list_spaces(state: State<'_, DbState>) -> Result<Vec<SpaceDto>, ApiError> {
    SpaceRepo::list(&state.conn).await.map_err(ApiError::from)
}
