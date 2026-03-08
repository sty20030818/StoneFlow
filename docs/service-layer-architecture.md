# Service 层架构设计

## 分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    Commands Layer                        │
│  - 接收前端请求参数                                       │
│  - 参数验证和转换                                        │
│  - 调用 Service 层                                       │
│  - 错误映射和响应                                        │
└─────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                         │
│  - 业务编排：协调多个 Repository                         │
│  - 事务管理：定义事务边界                                │
│  - 业务规则：跨实体的业务逻辑                            │
└─────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Repository Layer                        │
│  - 数据访问：CRUD 操作                                   │
│  - 查询构建：复杂查询逻辑                                │
│  - 数据映射：实体与 DTO 转换                             │
└─────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Database Layer                         │
│  - ORM 实体定义                                          │
│  - 数据库迁移                                            │
│  - 连接管理                                              │
└─────────────────────────────────────────────────────────┘
```

## 职责划分

### Commands Layer（命令层）

**职责**：
- 接收前端 Tauri 命令调用
- 参数反序列化和验证
- 调用 Service 层方法
- 错误类型转换（AppError → ApiError）
- 返回响应给前端

**示例**：
```rust
#[tauri::command]
pub async fn complete_task(
    state: State<'_, DbState>,
    id: String,
) -> Result<(), ApiError> {
    TaskService::complete(&state.conn, &id)
        .await
        .map_err(ApiError::from)
}
```

**禁止**：
- ❌ 编写业务逻辑
- ❌ 直接操作数据库
- ❌ 管理事务
- ❌ 跨实体操作

### Service Layer（服务层）

**职责**：
- 业务编排：协调多个 Repository 完成复杂业务流程
- 事务管理：定义事务边界，保证数据一致性
- 业务规则：实现跨实体的业务逻辑
- 活动日志：记录业务操作历史

**示例**：
```rust
pub async fn complete(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
    let now = now_ms();
    let txn = conn.begin().await?;

    // 1. 查找任务
    let task = TaskRepo::find_by_id(&txn, id).await?;

    // 2. 业务规则校验
    if task.status == "done" {
        return Err(AppError::Validation("任务已完成".to_string()));
    }

    // 3. 更新状态
    TaskRepo::update_status(&txn, id, "done", now).await?;

    // 4. 记录日志
    TaskRepo::append_completed_log(&txn, &task, now).await?;

    // 5. 更新项目统计
    if let Some(project_id) = &task.project_id {
        TaskRepo::refresh_project_stats(&txn, project_id, now).await?;
    }

    txn.commit().await?;
    Ok(())
}
```

**允许**：
- ✅ 管理事务边界
- ✅ 协调多个 Repository
- ✅ 实现业务规则
- ✅ 调用其他 Service

**禁止**：
- ❌ 直接操作数据库实体
- ❌ 构建复杂查询（应委托给 Repository）

### Repository Layer（仓储层）

**职责**：
- 数据访问：CRUD 操作
- 查询构建：复杂查询逻辑
- 数据映射：实体与 DTO 转换
- 简单的数据校验

**示例**：
```rust
pub async fn find_by_id(
    conn: &DatabaseConnection,
    id: &str,
) -> Result<TaskDto, AppError> {
    let task = tasks::Entity::find_by_id(id)
        .one(conn)
        .await?
        .ok_or_else(|| AppError::Validation("任务不存在".to_string()))?;

    Ok(TaskDto::from(task))
}

pub async fn update_status(
    conn: &DatabaseConnection,
    id: &str,
    status: &str,
    now: i64,
) -> Result<(), AppError> {
    let task = tasks::Entity::find_by_id(id)
        .one(conn)
        .await?
        .ok_or_else(|| AppError::Validation("任务不存在".to_string()))?;

    let mut active = task.into_active_model();
    active.status = Set(match status {
        "done" => TaskStatus::Done,
        _ => TaskStatus::Todo,
    });
    active.updated_at = Set(now);

    active.update(conn).await?;
    Ok(())
}
```

**允许**：
- ✅ 直接操作数据库实体
- ✅ 构建查询
- ✅ 简单的数据转换
- ✅ 简单的数据校验（如必填、格式）

**禁止**：
- ❌ 管理事务边界（由 Service 管理）
- ❌ 跨实体操作（应通过 Service 协调）
- ❌ 业务规则判断

## 迁移步骤

### 第1步：创建 Service 层骨架

1. 创建 `src-tauri/src/services/` 目录
2. 创建 `mod.rs` 和 `task_service.rs`
3. 在 `lib.rs` 中引入 `services` 模块

### 第2步：提取业务逻辑

针对每个包含业务逻辑的 Repository 方法：

1. 在 Service 层创建对应方法
2. 将业务逻辑从 Repository 移到 Service
3. 在 Repository 保留纯粹的数据访问方法
4. 更新 Command 调用 Service 而非 Repository

### 第3步：重构 complete 方法（示例）

**之前（Repository 包含业务逻辑）**：
```rust
// repos/task_repo/mod.rs
pub async fn complete(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
    let txn = conn.begin().await?;
    // ... 业务逻辑 ...
    txn.commit().await?;
    Ok(())
}
```

**之后（分层）**：
```rust
// services/task_service.rs
pub async fn complete(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
    let txn = conn.begin().await?;
    let task = TaskRepo::find_by_id(&txn, id).await?;
    // ... 业务逻辑 ...
    TaskRepo::update_status(&txn, id, "done", now).await?;
    // ... 更多业务操作 ...
    txn.commit().await?;
    Ok(())
}

// repos/task_repo/mod.rs
pub async fn update_status(conn: &DatabaseConnection, id: &str, status: &str, now: i64) -> Result<(), AppError> {
    // 纯粹的数据访问
}

// commands/tasks.rs
#[tauri::command]
pub async fn complete_task(state: State<'_, DbState>, id: String) -> Result<(), ApiError> {
    TaskService::complete(&state.conn, &id).await.map_err(ApiError::from)
}
```

## 优势

### 1. 单一职责

- **Command**: 参数处理
- **Service**: 业务编排
- **Repository**: 数据访问

### 2. 易于测试

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_complete_task() {
        let conn = setup_test_db().await;
        let task_id = create_test_task(&conn).await;

        // 测试 Service 层业务逻辑
        TaskService::complete(&conn, &task_id).await.unwrap();

        let task = TaskRepo::find_by_id(&conn, &task_id).await.unwrap();
        assert_eq!(task.status, "done");
    }
}
```

### 3. 易于维护

- 业务逻辑集中在 Service 层
- 数据访问集中在 Repository 层
- 职责清晰，易于定位问题

### 4. 易于扩展

- 新增业务功能：添加 Service 方法
- 新增数据访问：添加 Repository 方法
- 互不干扰

## 迁移优先级

### P0（立即迁移）

- [x] 创建 Service 层骨架
- [ ] `TaskRepo::complete` - 包含复杂业务逻辑
- [ ] `TaskRepo::create` - 包含日志记录和统计刷新

### P1（近期迁移）

- [ ] `ProjectRepo` 中的业务逻辑方法
- [ ] 其他包含跨实体操作的方法

### P2（长期优化）

- [ ] 统一错误处理
- [ ] 添加更多单元测试
- [ ] 性能优化

## 文件组织

```
src-tauri/src/
├── commands/           # 命令层
│   ├── tasks.rs       # 任务相关命令
│   └── projects.rs    # 项目相关命令
├── services/          # 服务层（新增）
│   ├── mod.rs
│   ├── task_service.rs
│   └── project_service.rs
├── repos/             # 仓储层
│   ├── task_repo/
│   └── project_repo/
├── db/                # 数据库层
└── types/             # 类型定义
```

## 注意事项

1. **渐进式迁移**：不影响现有功能，逐步重构
2. **保持向后兼容**：旧的 Repository 方法暂时保留
3. **测试覆盖**：迁移后添加单元测试
4. **文档同步**：更新代码注释和架构文档
