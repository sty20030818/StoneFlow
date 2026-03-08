# 测试策略与指南

## 测试概览

### 当前状态

- **Rust 后端**：部分 Repository 层有单元测试
- **Vue 前端**：暂无测试

### 测试金字塔

```
         /\
        /  \  E2E 测试（少量）
       /----\
      /      \  集成测试（适量）
     /--------\
    /          \  单元测试（大量）
   /------------\
```

## 测试策略

### 1. 后端测试（Rust）

#### 单元测试

**位置**：与源代码同一文件，使用 `#[cfg(test)]` 模块

**覆盖范围**：
- Repository 层的数据访问逻辑
- Service 层的业务逻辑
- 工具函数和帮助函数

**示例**：
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_complete_task() {
        let conn = setup_test_db().await;
        let task_id = create_test_task(&conn).await;
        
        TaskService::complete(&conn, &task_id).await.unwrap();
        
        let task = TaskRepo::find_by_id(&conn, &task_id).await.unwrap();
        assert_eq!(task.status, "done");
    }
}
```

#### 集成测试

**位置**：`src-tauri/tests/` 目录

**覆盖范围**：
- 完整的业务流程
- 跨模块协作
- 数据库集成

#### 测试工具

```rust
// 测试辅助函数
async fn setup_test_db() -> DatabaseConnection {
    let conn = Database::connect("sqlite::memory:")
        .await
        .expect("connect sqlite memory");
    Migrator::up(&conn, None).await.expect("run migrations");
    conn
}

async fn create_test_task(conn: &DatabaseConnection) -> String {
    let id = Uuid::new_v4().to_string();
    // 创建测试任务...
    id
}
```

### 2. 前端测试（Vue）

#### 单元测试

**工具**：Vitest + Vue Test Utils

**覆盖范围**：
- Composables 逻辑
- 工具函数
- Store 操作

**示例**：
```typescript
import { describe, it, expect } from 'vitest'
import { useErrorHandler } from '@/composables/base/useErrorHandler'

describe('useErrorHandler', () => {
  it('should handle API error', () => {
    const { handleApiError } = useErrorHandler()
    
    const error = {
      code: 'validation_error',
      message: 'Invalid input',
    }
    
    handleApiError(error)
    // 断言 toast 被调用
  })
})
```

#### 组件测试

**工具**：Vitest + @testing-library/vue

**示例**：
```typescript
import { render, fireEvent } from '@testing-library/vue'
import TaskItem from './TaskItem.vue'

describe('TaskItem', () => {
  it('should emit complete event when clicked', async () => {
    const { getByRole, emitted } = render(TaskItem, {
      props: { task: mockTask }
    })
    
    await fireEvent.click(getByRole('checkbox'))
    
    expect(emitted()).toHaveProperty('complete')
  })
})
```

#### E2E 测试

**工具**：Playwright 或 Cypress

**覆盖范围**：
- 关键用户流程
- 页面交互
- 跨页面操作

## 关键业务测试清单

### P0（高优先级）

#### 后端

- [ ] **TaskService::complete** - 任务完成业务逻辑
  - 正常完成流程
  - 重复完成校验
  - 活动日志记录
  - 项目统计更新

- [ ] **TaskRepo::create** - 任务创建
  - 基本创建
  - 默认值设置
  - Rank 计算
  - 标签关联

- [ ] **TaskRepo::update** - 任务更新
  - 部分字段更新
  - 字段校验
  - 活动日志

#### 前端

- [ ] **useProjectsQuery** - 项目查询
  - 查询缓存
  - 错误处理
  - 数据刷新

- [ ] **useErrorHandler** - 错误处理
  - API 错误识别
  - 错误提示
  - 国际化

### P1（中优先级）

#### 后端

- [ ] **ProjectService** - 项目相关业务
- [ ] **SyncService** - 远程同步逻辑
- [ ] **Validation** - 数据校验逻辑

#### 前端

- [ ] **useUIStore** - UI 状态管理
- [ ] **Query invalidation** - 缓存失效逻辑

### P2（低优先级）

- E2E 测试
- 性能测试
- 兼容性测试

## 测试环境配置

### Rust 测试

```bash
# 运行所有测试
cargo test

# 运行特定测试
cargo test test_complete_task

# 运行测试并显示输出
cargo test -- --nocapture
```

### Vue 测试（需要配置）

**安装依赖**：
```bash
bun add -D vitest @vue/test-utils @testing-library/vue jsdom
```

**配置 vitest.config.ts**：
```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

**添加测试脚本**：
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## 测试最佳实践

### 1. 测试命名

```rust
#[test]
fn should_return_error_when_task_not_found() {
    // ...
}
```

### 2. 测试结构（AAA 模式）

```rust
#[test]
fn test_function() {
    // Arrange（准备）
    let input = "test";
    
    // Act（执行）
    let result = function_under_test(input);
    
    // Assert（断言）
    assert_eq!(result, expected);
}
```

### 3. 测试隔离

```rust
#[tokio::test]
async fn test_isolated() {
    let conn = setup_test_db().await; // 每个测试独立的数据库
    // 测试逻辑...
}
```

### 4. 边界条件测试

```rust
#[test]
fn test_edge_cases() {
    // 空输入
    test_empty_input();
    
    // 最大值
    test_max_value();
    
    // 最小值
    test_min_value();
    
    // 非法值
    test_invalid_input();
}
```

## 测试覆盖率目标

- **Repository 层**：80%+
- **Service 层**：90%+
- **关键业务逻辑**：100%

## 持续集成

### GitHub Actions 配置

```yaml
name: Test

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - run: cd src-tauri && cargo test
  
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
```

## 测试文档

每个测试应包含：

1. **测试目的**：测试什么功能
2. **前置条件**：需要什么准备
3. **测试步骤**：如何执行
4. **预期结果**：应该得到什么结果

## 常见问题

### Q: 如何测试异步代码？

**A**: 使用 `#[tokio::test]`

```rust
#[tokio::test]
async fn test_async() {
    let result = async_function().await;
    assert!(result.is_ok());
}
```

### Q: 如何 mock 外部依赖？

**A**: 使用 trait 和依赖注入

```rust
#[async_trait]
pub trait TaskRepository {
    async fn find_by_id(&self, id: &str) -> Result<Task, Error>;
}

struct MockTaskRepository;

#[async_trait]
impl TaskRepository for MockTaskRepository {
    async fn find_by_id(&self, id: &str) -> Result<Task, Error> {
        Ok(Task { id: id.to_string(), ... })
    }
}
```

### Q: 如何测试需要 Tauri API 的前端代码？

**A**: Mock Tauri API

```typescript
vi.mock('@tauri-apps/api', () => ({
  invoke: vi.fn(),
}))
```

## 相关资源

- [Rust 测试文档](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Vitest 文档](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Library](https://testing-library.com/docs/vue-testing-library/intro/)

## 检查清单

完成测试配置后，确认：

- [ ] 测试框架已配置
- [ ] 测试脚本已添加
- [ ] 关键业务逻辑有测试覆盖
- [ ] CI/CD 集成测试
- [ ] 测试文档已更新
- [ ] 团队成员已培训测试流程
