//! 任务排序用例。
//!
//! 这里把“单条改 rank”和“批量重排 rank”单独抽出来，
//! 这样命令层看到的就是明确的排序语义，而不是手动构造 update patch。

use sea_orm::DatabaseConnection;

use crate::types::error::AppError;

use super::{
    dto::{TaskUpdateInput, TaskUpdatePatch},
    TaskService,
};

impl TaskService {
    /// 更新单个任务的排序权重。
    ///
    /// 实现上复用 `update`，避免再维护一套单独的写入逻辑。
    pub async fn reorder(
        conn: &DatabaseConnection,
        task_id: String,
        new_rank: i64,
    ) -> Result<(), AppError> {
        Self::update(
            conn,
            TaskUpdateInput {
                id: task_id,
                patch: TaskUpdatePatch::rank_only(new_rank),
            },
        )
        .await
    }

    /// 按给定顺序重新分配一组任务的 rank。
    pub async fn rebalance(
        conn: &DatabaseConnection,
        task_ids: &[String],
        step: i64,
    ) -> Result<(), AppError> {
        for (index, task_id) in task_ids.iter().enumerate() {
            let new_rank = (index as i64) * step;
            Self::reorder(conn, task_id.clone(), new_rank).await?;
        }
        Ok(())
    }
}
