# 性能监控与优化指南

## 概述

本文档定义了项目的性能监控策略、优化方法和最佳实践。

## 性能指标

### 关键指标（KPI）

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 应用启动时间 | < 2s | Tauri 启动性能监控 |
| 首屏加载时间 | < 1s | Vue devtools 性能面板 |
| 任务列表渲染 | < 100ms | Performance API |
| 任务创建响应 | < 200ms | 端到端测试 |
| 数据库查询 | < 50ms | SeaORM 查询日志 |
| 内存占用 | < 200MB | 系统监控工具 |

### 前端指标

```typescript
// 性能监控工具
interface PerformanceMetrics {
  // 首屏渲染时间
  firstContentfulPaint: number
  
  // 最大内容渲染时间
  largestContentfulPaint: number
  
  // 首次输入延迟
  firstInputDelay: number
  
  // 累积布局偏移
  cumulativeLayoutShift: number
  
  // 自定义指标
  taskListRenderTime: number
  taskCreationTime: number
}
```

### 后端指标

```rust
// 性能监控结构
pub struct PerformanceMetrics {
    // 数据库查询时间
    pub db_query_time_ms: u64,
    
    // 事务执行时间
    pub transaction_time_ms: u64,
    
    // 内存使用
    pub memory_usage_mb: u64,
    
    // 并发请求数
    pub concurrent_requests: usize,
}
```

## 性能监控工具

### 前端监控

#### 1. Vue Performance Devtools

```bash
# 安装 Vue Devtools
# 浏览器扩展商店搜索 "Vue.js devtools"
```

**监控内容：**
- 组件渲染时间
- 状态更新时间
- 路由切换时间

#### 2. Performance API

```typescript
// src/utils/performance.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  
  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor()
    }
    return this.instance
  }
  
  // 标记性能节点
  mark(name: string) {
    performance.mark(name)
  }
  
  // 测量性能
  measure(name: string, startMark: string, endMark: string) {
    try {
      performance.measure(name, startMark, endMark)
      const measure = performance.getEntriesByName(name, 'measure')[0]
      console.log(`${name}: ${measure.duration.toFixed(2)}ms`)
      return measure.duration
    } catch (error) {
      console.error('Performance measure error:', error)
      return 0
    }
  }
  
  // 监控函数执行时间
  async monitorAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      console.log(`${name}: ${duration.toFixed(2)}ms`)
      return result
    } catch (error) {
      const duration = performance.now() - start
      console.error(`${name} failed after ${duration.toFixed(2)}ms:`, error)
      throw error
    }
  }
  
  // 获取内存使用情况
  getMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize / 1024 / 1024,
        totalJSHeapSize: memory.totalJSHeapSize / 1024 / 1024,
        jsHeapSizeLimit: memory.jsHeapSizeLimit / 1024 / 1024,
      }
    }
    return null
  }
}
```

**使用示例：**

```typescript
import { PerformanceMonitor } from '@/utils/performance'

const monitor = PerformanceMonitor.getInstance()

// 监控异步操作
await monitor.monitorAsync('loadTasks', async () => {
  const { data } = await useProjectsQuery({ spaceId })
  return data
})
```

#### 3. TanStack Query Devtools

```typescript
// src/main.ts
import { VueQueryDevtools } from '@tanstack/vue-query-devtools'

app.use(VueQueryDevtools, {
  initialIsOpen: false,
})
```

### 后端监控

#### 1. 日志性能追踪

```rust
// src-tauri/src/utils/performance.rs
use std::time::{Duration, Instant};

pub struct PerformanceTracker {
    start: Instant,
    name: String,
}

impl PerformanceTracker {
    pub fn new(name: &str) -> Self {
        println!("[PERF] Starting: {}", name);
        Self {
            start: Instant::now(),
            name: name.to_string(),
        }
    }
    
    pub fn elapsed(&self) -> Duration {
        self.start.elapsed()
    }
    
    pub fn log_elapsed(&self) {
        let elapsed = self.elapsed();
        if elapsed.as_millis() > 100 {
            eprintln!("[PERF] Slow operation '{}': {:?}", self.name, elapsed);
        } else {
            println!("[PERF] Completed '{}': {:?}", self.name, elapsed);
        }
    }
}

impl Drop for PerformanceTracker {
    fn drop(&mut self) {
        self.log_elapsed();
    }
}

// 使用示例
pub async fn complete_task(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
    let _tracker = PerformanceTracker::new("complete_task");
    
    // 业务逻辑...
    
    Ok(())
}
```

#### 2. 数据库查询监控

```rust
// src-tauri/src/db/mod.rs
use sea_orm::{DatabaseConnection, DatabaseBackend, Statement};

pub fn setup_query_logging(conn: &DatabaseConnection) {
    // SeaORM 查询日志
    // 通过环境变量设置
    // RUST_LOG=sqlx::query=info,sqlx::query::slow=warn
}
```

## 性能优化策略

### 前端优化

#### 1. 虚拟滚动

**问题：** 大量任务列表渲染慢

**解决方案：**

```bash
bun add -D @tanstack/vue-virtual
```

```vue
<script setup lang="ts">
import { useVirtualizer } from '@tanstack/vue-virtual'

const virtualizer = useVirtualizer({
  count: tasks.value.length,
  getScrollElement: () => scrollElement.value,
  estimateSize: () => 48, // 每个任务项高度
  overscan: 5,
})
</script>

<template>
  <div ref="scrollElement" class="h-screen overflow-auto">
    <div :style="{ height: `${virtualizer.getTotalSize()}px` }">
      <div
        v-for="virtualItem in virtualizer.getVirtualItems()"
        :key="virtualItem.key"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualItem.size}px`,
          transform: `translateY(${virtualItem.start}px)`,
        }"
      >
        <TaskItem :task="tasks[virtualItem.index]" />
      </div>
    </div>
  </div>
</template>
```

#### 2. 懒加载

```typescript
// 路由懒加载
const routes = [
  {
    path: '/settings',
    component: () => import('@/features/settings/ui/SettingsPage.vue'),
  },
]

// 组件懒加载
const HeavyComponent = defineAsyncComponent(() =>
  import('@/features/workspace/ui/TaskBoard.vue')
)
```

#### 3. 数据缓存

```typescript
// TanStack Query 缓存配置
useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
  staleTime: 5 * 60 * 1000, // 5分钟内数据新鲜
  gcTime: 10 * 60 * 1000, // 10分钟后垃圾回收
  refetchOnWindowFocus: false,
})
```

#### 4. 防抖和节流

```typescript
import { useDebounceFn, useThrottleFn } from '@vueuse/core'

// 防抖：搜索输入
const debouncedSearch = useDebounceFn((query: string) => {
  searchTasks(query)
}, 300)

// 节流：滚动事件
const throttledScroll = useThrottleFn((event: Event) => {
  handleScroll(event)
}, 100)
```

#### 5. 计算属性优化

```typescript
// 避免重复计算
const filteredTasks = computed(() => {
  // 缓存中间结果
  const statusFilter = statusFilter.value
  const priorityFilter = priorityFilter.value
  
  return tasks.value.filter(task => {
    if (statusFilter && task.status !== statusFilter) return false
    if (priorityFilter && task.priority !== priorityFilter) return false
    return true
  })
})
```

### 后端优化

#### 1. 数据库查询优化

**索引优化：**

```rust
// src-tauri/src/db/migrator/m04_indexes.rs
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m04_indexes"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 任务查询索引
        manager
            .create_index(
                Index::create()
                    .name("idx_tasks_space_status")
                    .table(Tasks::Table)
                    .col(Tasks::SpaceId)
                    .col(Tasks::Status)
                    .to_owned(),
            )
            .await?;
        
        // 项目查询索引
        manager
            .create_index(
                Index::create()
                    .name("idx_projects_space_deleted")
                    .table(Projects::Table)
                    .col(Projects::SpaceId)
                    .col(Projects::DeletedAt)
                    .to_owned(),
            )
            .await?;
        
        Ok(())
    }
}
```

**查询优化：**

```rust
// 避免N+1查询
pub async fn list_tasks_with_projects(conn: &DatabaseConnection) -> Result<Vec<TaskWithProject>, AppError> {
    // 使用 JOIN 一次性查询
    let tasks = tasks::Entity::find()
        .find_also_related(projects::Entity)
        .all(conn)
        .await?;
    
    Ok(tasks.into_iter().map(|(task, project)| {
        TaskWithProject {
            task: task.into(),
            project: project.map(|p| p.into()),
        }
    }).collect())
}
```

#### 2. 批量操作优化

```rust
// 批量插入
pub async fn batch_create_tasks(
    conn: &DatabaseConnection,
    tasks: Vec<CreateTaskInput>,
) -> Result<Vec<TaskDto>, AppError> {
    let txn = conn.begin().await?;
    
    // 批量插入，而不是循环插入
    let active_models: Vec<tasks::ActiveModel> = tasks
        .into_iter()
        .map(|input| {
            tasks::ActiveModel {
                id: Set(Uuid::new_v4().to_string()),
                title: Set(input.title),
                // ...
                ..Default::default()
            }
        })
        .collect();
    
    tasks::Entity::insert_many(active_models)
        .exec(&txn)
        .await?;
    
    txn.commit().await?;
    Ok(vec![])
}
```

#### 3. 连接池配置

```rust
// src-tauri/src/db/mod.rs
use sea_orm::{Database, DatabaseConnection};

pub async fn init_db(app_handle: &AppHandle) -> Result<DbState, Box<dyn std::error::Error>> {
    let db_path = get_db_path(app_handle)?;
    let db_url = format!("sqlite://{}?mode=rwc", db_path);
    
    let conn = Database::connect(&db_url)
        .max_connections(10) // 最大连接数
        .min_connections(2)  // 最小连接数
        .connect_timeout(Duration::from_secs(5)) // 连接超时
        .idle_timeout(Duration::from_secs(600))  // 空闲超时
        .await?;
    
    Ok(DbState { conn })
}
```

#### 4. 内存优化

```rust
// 使用 Arc 共享数据
use std::sync::Arc;

pub struct Cache<T> {
    data: Arc<Vec<T>>,
}

impl<T> Clone for Cache<T> {
    fn clone(&self) -> Self {
        Self {
            data: Arc::clone(&self.data),
        }
    }
}
```

## 性能测试

### 基准测试

```rust
// benches/task_operations.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_task_creation(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let conn = setup_test_db();
    
    c.bench_function("create_task", |b| {
        b.to_async(&rt).iter(|| {
            let conn = conn.clone();
            async move {
                TaskRepo::create(&conn, "test-space", "Test Task", true, None)
                    .await
                    .unwrap()
            }
        });
    });
}

criterion_group!(benches, bench_task_creation);
criterion_main!(benches);
```

### 负载测试

```typescript
// tests/performance/load-test.ts
describe('Load Test', () => {
  it('should handle 1000 tasks', async () => {
    const tasks = Array.from({ length: 1000 }, (_, i) => ({
      title: `Task ${i}`,
      spaceId: 'test-space',
    }))
    
    const start = performance.now()
    
    await Promise.all(
      tasks.map(task => createTask(task))
    )
    
    const duration = performance.now() - start
    expect(duration).toBeLessThan(10000) // 10秒内完成
  })
})
```

## 性能监控仪表板

### Prometheus + Grafana（可选）

```yaml
# docker-compose.yml
version: '3'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 性能检查清单

### 开发阶段

- [ ] 使用 PerformanceMonitor 监控关键操作
- [ ] 检查组件渲染时间（< 16ms）
- [ ] 检查数据库查询时间（< 50ms）
- [ ] 检查内存泄漏
- [ ] 检查网络请求大小

### 测试阶段

- [ ] 运行性能基准测试
- [ ] 运行负载测试
- [ ] 检查慢查询日志
- [ ] 检查内存占用
- [ ] 检查 CPU 使用率

### 上线前

- [ ] 启用生产环境性能监控
- [ ] 配置性能告警
- [ ] 准备性能优化预案
- [ ] 文档化性能基线

## 性能问题排查

### 常见问题

#### 1. 内存泄漏

**症状：** 内存持续增长

**排查步骤：**
1. 使用 Chrome DevTools Memory 面板
2. 检查事件监听器是否移除
3. 检查定时器是否清理
4. 检查 Vue 组件是否正确销毁

**解决方案：**
```typescript
onUnmounted(() => {
  // 清理定时器
  clearInterval(timer)
  // 移除事件监听
  window.removeEventListener('resize', handler)
})
```

#### 2. 慢查询

**症状：** 数据库操作耗时过长

**排查步骤：**
1. 启用 SQL 日志
2. 使用 EXPLAIN 分析查询计划
3. 检查缺失的索引
4. 检查 N+1 查询问题

**解决方案：**
```sql
-- 分析查询计划
EXPLAIN QUERY PLAN
SELECT * FROM tasks WHERE space_id = 'xxx' AND status = 'todo';

-- 添加索引
CREATE INDEX idx_tasks_space_status ON tasks(space_id, status);
```

#### 3. 渲染慢

**症状：** UI 卡顿、掉帧

**排查步骤：**
1. 使用 Vue Devtools Performance 面板
2. 检查大型列表渲染
3. 检查复杂计算属性
4. 检查频繁的状态更新

**解决方案：**
```vue
<!-- 使用虚拟滚动 -->
<VirtualList :items="largeList" />

<!-- 避免内联函数 -->
<TaskItem
  :task="task"
  @complete="handleComplete"  <!-- ✅ 好 -->
  @complete="() => complete(task)"  <!-- ❌ 不好 -->
/>
```

## 相关资源

- [Web Vitals](https://web.dev/vitals/)
- [Vue Performance](https://vuejs.org/guide/best-practices/performance.html)
- [Rust Performance](https://nnethercote.github.io/perf-book/)
- [SQLite Optimization](https://www.sqlite.org/optoverview.html)

## 检查清单

完成性能优化后，确认：

- [ ] 性能监控工具已配置
- [ ] 关键指标已达标
- [ ] 性能测试已通过
- [ ] 性能文档已更新
- [ ] 团队已培训性能优化最佳实践
