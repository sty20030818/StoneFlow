//! TaskService 测试示例。
//!
//! 注意：这些是示例测试，展示了如何测试 Service 层的业务逻辑。
//! 实际运行前需要确保数据库迁移和测试工具链配置完成。

#[cfg(test)]
mod tests {
    use sea_orm::{ActiveModelTrait, Database, DatabaseConnection, Set};
    use sea_orm_migration::MigratorTrait;
    use uuid::Uuid;

    use crate::db::entities::{
        sea_orm_active_enums::{Priority, TaskStatus},
        spaces, tasks,
    };
    use crate::db::migrator::Migrator;
    use crate::services::TaskService;
    use crate::types::error::AppError;

    /// 设置测试数据库
    async fn setup_test_db() -> DatabaseConnection {
        let conn = Database::connect("sqlite::memory:")
            .await
            .expect("Failed to connect to test database");
        Migrator::up(&conn, None)
            .await
            .expect("Failed to run migrations");
        conn
    }

    /// 创建测试空间
    async fn create_test_space(conn: &DatabaseConnection, space_id: &str) {
        spaces::ActiveModel {
            id: Set(space_id.to_string()),
            name: Set("Test Space".to_string()),
            order: Set(0),
            created_at: Set(1),
            updated_at: Set(1),
        }
        .insert(conn)
        .await
        .expect("Failed to create test space");
    }

    /// 创建测试任务
    async fn create_test_task(
        conn: &DatabaseConnection,
        task_id: &str,
        space_id: &str,
        status: TaskStatus,
    ) -> String {
        let id = task_id.to_string();

        tasks::ActiveModel {
            id: Set(id.clone()),
            space_id: Set(space_id.to_string()),
            project_id: Set(None),
            title: Set("Test Task".to_string()),
            note: Set(None),
            status: Set(status.clone()),
            done_reason: Set(None),
            priority: Set(Priority::P1),
            rank: Set(1024),
            created_at: Set(1),
            updated_at: Set(1),
            completed_at: Set(None),
            deadline_at: Set(None),
            archived_at: Set(None),
            deleted_at: Set(None),
            custom_fields: Set(None),
            create_by: Set("test_user".to_string()),
        }
        .insert(conn)
        .await
        .expect("Failed to create test task");

        id
    }

    #[tokio::test]
    async fn should_complete_task_successfully() {
        // Arrange
        let conn = setup_test_db().await;
        create_test_space(&conn, "test-space").await;
        let task_id = create_test_task(&conn, "test-task-1", "test-space", TaskStatus::Todo).await;

        // Act
        let result = TaskService::complete_example(&conn, &task_id).await;

        // Assert
        assert!(result.is_ok(), "Task should be completed successfully");

        // Verify task status
        let task = tasks::Entity::find_by_id(&task_id)
            .one(&conn)
            .await
            .expect("Failed to fetch task")
            .expect("Task not found");

        assert_eq!(task.status, TaskStatus::Done);
        assert!(task.completed_at.is_some());
    }

    #[tokio::test]
    async fn should_return_error_when_task_not_found() {
        // Arrange
        let conn = setup_test_db().await;
        let non_existent_id = Uuid::new_v4().to_string();

        // Act
        let result = TaskService::complete_example(&conn, &non_existent_id).await;

        // Assert
        assert!(result.is_err(), "Should return error for non-existent task");
        
        match result {
            Err(AppError::Validation(msg)) => {
                assert!(msg.contains("不存在") || msg.contains("not found"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[tokio::test]
    async fn should_handle_concurrent_completions() {
        // Arrange
        let conn = setup_test_db().await;
        create_test_space(&conn, "test-space").await;
        let task_id = create_test_task(&conn, "test-task-2", "test-space", TaskStatus::Todo).await;

        // Act - 尝试并发完成同一任务
        let conn_clone = Database::connect("sqlite::memory:")
            .await
            .expect("Failed to clone connection");
        
        // Note: 实际测试中应该使用真正的并发测试
        let result1 = TaskService::complete_example(&conn, &task_id).await;
        let result2 = TaskService::complete_example(&conn_clone, &task_id).await;

        // Assert - 至少有一个应该成功
        assert!(
            result1.is_ok() || result2.is_ok(),
            "At least one completion should succeed"
        );
    }

    /// 测试边界条件
    mod edge_cases {
        use super::*;

        #[tokio::test]
        async fn should_handle_empty_task_id() {
            let conn = setup_test_db().await;
            let result = TaskService::complete_example(&conn, "").await;
            assert!(result.is_err(), "Should return error for empty task ID");
        }

        #[tokio::test]
        async fn should_handle_very_long_task_id() {
            let conn = setup_test_db().await;
            let long_id = "x".repeat(1000);
            let result = TaskService::complete_example(&conn, &long_id).await;
            assert!(result.is_err(), "Should return error for very long task ID");
        }
    }

    /// 性能测试示例
    mod performance {
        use super::*;

        #[tokio::test]
        async fn should_complete_multiple_tasks_quickly() {
            let conn = setup_test_db().await;
            create_test_space(&conn, "perf-space").await;

            // 创建 100 个任务
            let mut task_ids = Vec::new();
            for i in 0..100 {
                let task_id = format!("perf-task-{}", i);
                create_test_task(
                    &conn,
                    &task_id,
                    "perf-space",
                    TaskStatus::Todo,
                )
                .await;
                task_ids.push(task_id);
            }

            // 批量完成并计时
            let start = std::time::Instant::now();
            for task_id in task_ids {
                let _ = TaskService::complete_example(&conn, &task_id).await;
            }
            let duration = start.elapsed();

            // 性能断言：100 个任务应该在 5 秒内完成
            assert!(
                duration.as_secs() < 5,
                "Completing 100 tasks took too long: {:?}",
                duration
            );
        }
    }
}

/// 测试辅助宏
#[cfg(test)]
macro_rules! assert_ok {
    ($expr:expr) => {
        match $expr {
            Ok(value) => value,
            Err(e) => panic!("Expected Ok, got Err: {:?}", e),
        }
    };
}

#[cfg(test)]
macro_rules! assert_err {
    ($expr:expr) => {
        match $expr {
            Err(e) => e,
            Ok(value) => panic!("Expected Err, got Ok: {:?}", value),
        }
    };
}
