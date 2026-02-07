//! 默认 Space seed。
//! 重点：仅在表为空时插入，保证幂等。

use sea_orm::{
    ActiveModelTrait, DatabaseConnection, EntityTrait, PaginatorTrait, Set, TransactionTrait,
};

use crate::db::entities::spaces;
use crate::db::now_ms;
use crate::types::error::AppError;

pub async fn seed_default_spaces_if_empty(conn: &DatabaseConnection) -> Result<(), AppError> {
    let count = spaces::Entity::find()
        .count(conn)
        .await
        .map_err(AppError::from)?;

    if count > 0 {
        // 已有数据就不再注入默认值。
        return Ok(());
    }

    let now = now_ms();
    // 重点：seed 使用事务，保证“要么全部插入，要么全部回滚”。
    let txn = conn.begin().await.map_err(AppError::from)?;

    let spaces_data = [
        ("work", "工作", 1_i64),
        ("study", "学习", 2_i64),
        ("personal", "个人", 3_i64),
    ];

    for (id, name, order) in spaces_data {
        let active = spaces::ActiveModel {
            id: Set(id.to_string()),
            name: Set(name.to_string()),
            order: Set(order),
            created_at: Set(now),
            updated_at: Set(now),
        };
        active.insert(&txn).await.map_err(AppError::from)?;
    }

    txn.commit().await.map_err(AppError::from)?;
    Ok(())
}
