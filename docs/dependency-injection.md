# 依赖注入与可测试性改进指南

## 概述

本文档说明如何使用 trait 抽象改进依赖注入，提升代码的可测试性和可维护性。

## 当前问题

### 问题示例

```rust
// ❌ 当前实现：Service 直接依赖具体类型
pub struct TaskService;

impl TaskService {
    pub async fn complete(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
        // 直接使用 TaskRepo 具体类型
        let task = TaskRepo::find_by_id(conn, id).await?;
        TaskRepo::update_status(conn, id, "done", now_ms()).await?;
        // ...
    }
}
```

**问题：**
1. 难以测试：无法 mock `TaskRepo`
2. 紧耦合：Service 与 Repository 强绑定
3. 不灵活：难以替换实现

## 解决方案：Trait 抽象

### 步骤1: 定义 Repository Trait

```rust
// src-tauri/src/repos/traits.rs
use async_trait::async_trait;
use crate::types::{dto::TaskDto, error::AppError};

#[async_trait]
pub trait TaskRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<TaskDto, AppError>;
    async fn update_status(&self, id: &str, status: &str, now: i64) -> Result<(), AppError>;
    async fn append_completed_log(&self, task: &TaskDto, now: i64) -> Result<(), AppError>;
    async fn refresh_project_stats(&self, project_id: &str, now: i64) -> Result<(), AppError>;
}

#[async_trait]
pub trait ProjectRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<ProjectDto, AppError>;
    async fn update_stats(&self, id: &str, stats: ProjectStats) -> Result<(), AppError>;
}
```

### 步骤2: 实现 Trait

```rust
// src-tauri/src/repos/task_repo.rs
use async_trait::async_trait;
use super::traits::TaskRepository;

pub struct TaskRepo;

#[async_trait]
impl TaskRepository for TaskRepo {
    async fn find_by_id(&self, conn: &DatabaseConnection, id: &str) -> Result<TaskDto, AppError> {
        // 具体实现...
        let task = tasks::Entity::find_by_id(id)
            .one(conn)
            .await?
            .ok_or_else(|| AppError::Validation("任务不存在".to_string()))?;
        
        Ok(TaskDto::from(task))
    }
    
    async fn update_status(&self, conn: &DatabaseConnection, id: &str, status: &str, now: i64) -> Result<(), AppError> {
        // 具体实现...
    }
}
```

### 步骤3: Service 依赖 Trait

```rust
// src-tauri/src/services/task_service.rs
use std::sync::Arc;
use crate::repos::traits::TaskRepository;

pub struct TaskService<R: TaskRepository> {
    repo: Arc<R>,
}

impl<R: TaskRepository> TaskService<R> {
    pub fn new(repo: Arc<R>) -> Self {
        Self { repo }
    }
    
    pub async fn complete(&self, id: &str) -> Result<(), AppError> {
        let now = now_ms();
        
        // 使用 trait 方法
        let task = self.repo.find_by_id(id).await?;
        
        if task.status == "done" {
            return Err(AppError::Validation("任务已完成".to_string()));
        }
        
        self.repo.update_status(id, "done", now).await?;
        self.repo.append_completed_log(&task, now).await?;
        
        if let Some(project_id) = &task.project_id {
            self.repo.refresh_project_stats(project_id, now).await?;
        }
        
        Ok(())
    }
}
```

### 步骤4: 创建 Mock 实现

```rust
// src-tauri/src/repos/mocks.rs
use async_trait::async_trait;
use super::traits::TaskRepository;
use crate::types::{dto::TaskDto, error::AppError};

pub struct MockTaskRepository {
    pub tasks: std::collections::HashMap<String, TaskDto>,
}

#[async_trait]
impl TaskRepository for MockTaskRepository {
    async fn find_by_id(&self, id: &str) -> Result<TaskDto, AppError> {
        self.tasks
            .get(id)
            .cloned()
            .ok_or_else(|| AppError::Validation("任务不存在".to_string()))
    }
    
    async fn update_status(&self, id: &str, status: &str, now: i64) -> Result<(), AppError> {
        // Mock 实现
        Ok(())
    }
    
    async fn append_completed_log(&self, task: &TaskDto, now: i64) -> Result<(), AppError> {
        // Mock 实现
        Ok(())
    }
    
    async fn refresh_project_stats(&self, project_id: &str, now: i64) -> Result<(), AppError> {
        // Mock 实现
        Ok(())
    }
}
```

### 步骤5: 使用 Service

#### 生产环境

```rust
// src-tauri/src/commands/tasks.rs
use std::sync::Arc;

#[tauri::command]
pub async fn complete_task(
    state: State<'_, DbState>,
    id: String,
) -> Result<(), ApiError> {
    // 创建真实的 Repository
    let repo = Arc::new(TaskRepo);
    let service = TaskService::new(repo);
    
    service.complete(&state.conn, &id)
        .await
        .map_err(ApiError::from)
}
```

#### 测试环境

```rust
// src-tauri/src/services/task_service_tests.rs
#[tokio::test]
async fn test_complete_task() {
    // 创建 Mock Repository
    let mut mock_repo = MockTaskRepository {
        tasks: std::collections::HashMap::new(),
    };
    
    mock_repo.tasks.insert(
        "task-1".to_string(),
        TaskDto {
            id: "task-1".to_string(),
            status: "todo".to_string(),
            ..Default::default()
        },
    );
    
    // 使用 Mock 测试 Service
    let service = TaskService::new(Arc::new(mock_repo));
    let result = service.complete("task-1").await;
    
    assert!(result.is_ok());
}
```

## 依赖注入容器（可选）

对于复杂项目，可以使用依赖注入容器：

```rust
// src-tauri/src/container.rs
use std::sync::Arc;
use crate::repos::{TaskRepo, ProjectRepo, traits::*};
use crate::services::{TaskService, ProjectService};

pub struct AppContainer {
    task_repo: Arc<TaskRepo>,
    project_repo: Arc<ProjectRepo>,
}

impl AppContainer {
    pub fn new() -> Self {
        Self {
            task_repo: Arc::new(TaskRepo),
            project_repo: Arc::new(ProjectRepo),
        }
    }
    
    pub fn task_service(&self) -> TaskService<TaskRepo> {
        TaskService::new(Arc::clone(&self.task_repo))
    }
    
    pub fn project_service(&self) -> ProjectService<ProjectRepo> {
        ProjectService::new(Arc::clone(&self.project_repo))
    }
}

// 在 Tauri setup 中注册
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let container = Arc::new(AppContainer::new());
            app.manage(container);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 前端依赖注入

前端可以使用 Vue 的 provide/inject 或 Pinia 实现：

```typescript
// src/composables/base/useInjection.ts
import { inject, provide, type InjectionKey } from 'vue'

// 定义注入键
export const TaskRepositoryKey: InjectionKey<TaskRepository> = Symbol('TaskRepository')

// Repository 接口
export interface TaskRepository {
  findById(id: string): Promise<TaskDto>
  create(input: CreateTaskInput): Promise<TaskDto>
  update(id: string, input: UpdateTaskInput): Promise<void>
  delete(id: string): Promise<void>
}

// 真实实现
class TaskRepositoryImpl implements TaskRepository {
  async findById(id: string): Promise<TaskDto> {
    return await invoke('get_task', { id })
  }
  
  async create(input: CreateTaskInput): Promise<TaskDto> {
    return await invoke('create_task', { input })
  }
  
  // ...
}

// Mock 实现（测试用）
export class MockTaskRepository implements TaskRepository {
  private tasks: Map<string, TaskDto> = new Map()
  
  async findById(id: string): Promise<TaskDto> {
    const task = this.tasks.get(id)
    if (!task) throw new Error('Task not found')
    return task
  }
  
  async create(input: CreateTaskInput): Promise<TaskDto> {
    const task = { id: uuid(), ...input }
    this.tasks.set(task.id, task)
    return task
  }
  
  // ...
}

// 提供依赖
export function provideTaskRepository(repo?: TaskRepository) {
  const repository = repo ?? new TaskRepositoryImpl()
  provide(TaskRepositoryKey, repository)
}

// 注入依赖
export function useTaskRepository(): TaskRepository {
  const repo = inject(TaskRepositoryKey)
  if (!repo) {
    throw new Error('TaskRepository not provided')
  }
  return repo
}

// Service 使用依赖
export function useTaskService() {
  const repo = useTaskRepository()
  
  const completeTask = async (id: string) => {
    const task = await repo.findById(id)
    if (task.status === 'done') {
      throw new Error('Task already completed')
    }
    await repo.update(id, { status: 'done', completedAt: Date.now() })
  }
  
  return {
    completeTask,
  }
}
```

**测试示例：**

```typescript
// tests/services/task-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MockTaskRepository, provideTaskRepository, useTaskService } from '@/composables/base/useInjection'

describe('TaskService', () => {
  beforeEach(() => {
    // 提供 Mock Repository
    provideTaskRepository(new MockTaskRepository())
  })
  
  it('should complete task', async () => {
    const { completeTask } = useTaskService()
    
    await completeTask('task-1')
    
    // 验证...
  })
})
```

## 迁移策略

### 阶段1: 定义 Trait（低风险）

1. 创建 `repos/traits.rs` 定义 trait
2. 为现有 Repository 实现 trait
3. 保持现有代码不变

### 阶段2: 重构 Service（中风险）

1. 修改 Service 依赖 trait 而非具体类型
2. 更新 Command 调用方式
3. 添加测试验证

### 阶段3: 添加 Mock（低风险）

1. 创建 Mock 实现
2. 编写单元测试
3. 逐步替换集成测试

## 优缺点分析

### 优点

✅ **可测试性**：可以轻松 mock 依赖进行单元测试  
✅ **解耦合**：Service 与 Repository 解耦，职责清晰  
✅ **灵活性**：易于替换实现，支持多种存储后端  
✅ **类型安全**：编译时保证接口一致性  

### 缺点

❌ **复杂度增加**：需要定义 trait 和实现  
❌ **样板代码**：需要更多代码实现相同功能  
❌ **学习曲线**：团队需要理解 trait 和泛型  

## 最佳实践

### 1. 优先使用具体类型

```rust
// ✅ 简单场景：直接使用具体类型
let service = TaskService::new(Arc::new(TaskRepo));

// ✅ 复杂场景：使用 trait 抽象
let service: TaskService<Box<dyn TaskRepository>> = TaskService::new(Box::new(TaskRepo));
```

### 2. 渐进式重构

```rust
// 第一步：定义 trait
trait TaskRepository { /* ... */ }

// 第二步：实现 trait
impl TaskRepository for TaskRepo { /* ... */ }

// 第三步：重构 Service
impl<R: TaskRepository> TaskService<R> { /* ... */ }

// 第四步：添加测试
#[test]
fn test_with_mock() { /* ... */ }
```

### 3. 保持简单

```rust
// ❌ 过度设计
pub trait TaskRepository: Send + Sync + Clone + Debug { /* ... */ }

// ✅ 适度设计
pub trait TaskRepository: Send + Sync { /* ... */ }
```

## 相关资源

- [Rust Trait 官方文档](https://doc.rust-lang.org/book/ch10-02-traits.html)
- [async-trait crate](https://docs.rs/async-trait/)
- [Dependency Injection in Rust](https://github.com/dtolnay/proc-macro-workshop)

## 检查清单

完成依赖注入改进后，确认：

- [ ] Repository trait 已定义
- [ ] 具体 Repository 已实现 trait
- [ ] Service 依赖 trait 而非具体类型
- [ ] Mock 实现已创建
- [ ] 单元测试已编写
- [ ] 文档已更新
- [ ] 团队已培训
