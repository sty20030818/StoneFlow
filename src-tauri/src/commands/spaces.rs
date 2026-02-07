//! Space 相关命令。
//! 重点：命令层只做参数/错误边界，业务查询下沉到 `SpaceRepo`。

use tauri::State;

use crate::db::DbState;
use crate::repos::space_repo::SpaceRepo;
use crate::types::{dto::SpaceDto, error::ApiError};

#[tauri::command]
pub async fn list_spaces(state: State<'_, DbState>) -> Result<Vec<SpaceDto>, ApiError> {
    // `State<'_, DbState>` 由 Tauri 注入，内部持有数据库连接。
    SpaceRepo::list(&state.conn).await.map_err(ApiError::from)
}
