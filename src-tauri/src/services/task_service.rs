//! 任务服务层示例实现。
//!
//! 本文件展示如何将业务逻辑从 Repository 迁移到 Service 层。
//! 当前为示例代码，实际迁移需要逐步进行。

use sea_orm::{DatabaseConnection, TransactionTrait};

use crate::db::now_ms;
use crate::repos::task_repo::TaskRepo;
use crate::types::error::AppError;

pub struct TaskService;

impl TaskService {
    /// 完成任务（业务编排示例）
    ///
    /// 业务规则：
    /// 1. 更新任务状态为 Done
    /// 2. 记录活动日志
    /// 3. 刷新项目统计
    ///
    /// 注意：当前 TaskRepo::complete 包含了这些逻辑，
    /// 迁移后应拆分为多个 Repository 方法调用。
    pub async fn complete_example(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
        let now = now_ms();
        let txn = conn.begin().await.map_err(AppError::from)?;

        // 示例：未来拆分后的调用方式
        // 1. 查找任务
        // let task = TaskRepo::find_by_id(&txn, id).await?;

        // 2. 校验业务规则
        // if task.status == "done" {
        //     return Err(AppError::Validation("任务已完成".to_string()));
        // }

        // 3. 更新状态
        // TaskRepo::update_status(&txn, id, "done", now).await?;

        // 4. 记录日志
        // TaskRepo::append_completed_log(&txn, &task, now).await?;

        // 5. 更新项目统计
        // if let Some(project_id) = &task.project_id {
        //     TaskRepo::refresh_project_stats(&txn, project_id, now).await?;
        // }

        // 当前：直接调用 Repository 的 complete 方法
        // 迁移后会替换为上述拆分后的调用
        drop((now, txn));

        // 临时：调用现有方法
        TaskRepo::complete(conn, id).await
    }
}

/// 迁移指南
///
/// ## 步骤1: 拆分 Repository 方法
///
/// 在 TaskRepo 中添加细粒度的方法：
/// - find_by_id(conn, id) -> TaskDto
/// - update_status(conn, id, status, now) -> ()
/// - append_completed_log(conn, task, now) -> ()
/// - refresh_project_stats(conn, project_id, now) -> ()
///
/// ## 步骤2: 在 Service 中编排
///
/// ```rust
/// pub async fn complete(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
///     let now = now_ms();
///     let txn = conn.begin().await?;
///
///     let task = TaskRepo::find_by_id(&txn, id).await?;
///
///     if task.status == "done" {
///         return Err(AppError::Validation("任务已完成".to_string()));
///     }
///
///     TaskRepo::update_status(&txn, id, "done", now).await?;
///     TaskRepo::append_completed_log(&txn, &task, now).await?;
///
///     if let Some(project_id) = &task.project_id {
///         TaskRepo::refresh_project_stats(&txn, project_id, now).await?;
///     }
///
///     txn.commit().await?;
///     Ok(())
/// }
/// ```
///
/// ## 步骤3: 更新 Command 调用
///
/// ```rust
/// // commands/tasks.rs
/// #[tauri::command]
/// pub async fn complete_task(
///     state: State<'_, DbState>,
///     id: String,
/// ) -> Result<(), ApiError> {
///     TaskService::complete(&state.conn, &id)
///         .await
///         .map_err(ApiError::from)
/// }
/// ```
///
/// ## 步骤4: 移除 Repository 中的业务逻辑
///
/// 删除 TaskRepo::complete 方法，保留细粒度的数据访问方法。
