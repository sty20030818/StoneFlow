//! Space 仓储。
//! 重点：这是最简单的 repo，适合作为“Entity -> DTO”映射入门示例。

use sea_orm::{DatabaseConnection, EntityTrait, QueryOrder};

use crate::db::entities::spaces;
use crate::types::{dto::SpaceDto, error::AppError};

pub struct SpaceRepo;

impl SpaceRepo {
    pub async fn list(conn: &DatabaseConnection) -> Result<Vec<SpaceDto>, AppError> {
        // 按 order 排序，保持前端展示稳定。
        let models = spaces::Entity::find()
            .order_by_asc(spaces::Column::Order)
            .all(conn)
            .await
            .map_err(AppError::from)?;

        Ok(models
            .into_iter()
            .map(|m| SpaceDto {
                id: m.id,
                name: m.name,
                order: m.order,
                created_at: m.created_at,
                updated_at: m.updated_at,
            })
            .collect())
    }
}
