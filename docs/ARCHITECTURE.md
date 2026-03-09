# 项目架构总览

## 目录结构

```
stoneflow/
├── docs/                          # 项目文档
│   ├── state-management-migration.md
│   ├── service-layer-architecture.md
│   ├── feature-modules-merge-plan.md
│   ├── error-handling-guide.md
│   ├── testing-strategy.md
│   ├── performance-optimization.md
│   └── dependency-injection.md
│
├── src/                           # Vue 前端源码
│   ├── app/                       # 应用引导
│   ├── assets/                    # 静态资源
│   ├── components/                # 全局组件
│   ├── composables/               # 组合式函数
│   │   ├── app/
│   │   ├── base/                  # 基础 composables
│   │   │   └── useErrorHandler.ts
│   │   └── domain/
│   ├── config/                    # 配置文件
│   ├── features/                  # 业务功能模块
│   │   ├── workspace/             # 工作区
│   │   ├── inspector/             # 详情面板
│   │   ├── settings/              # 设置
│   │   └── ...
│   ├── i18n/                      # 国际化
│   ├── layouts/                   # 布局组件
│   ├── pages/                     # 页面组件
│   ├── plugins/                   # 插件
│   ├── router/                    # 路由配置
│   ├── services/                  # 服务层
│   │   ├── api/                   # API 调用
│   │   └── tauri/                 # Tauri 集成
│   ├── startup/                   # 启动逻辑
│   ├── stores/                    # Pinia 状态管理
│   │   ├── ui.ts                  # UI 状态
│   │   └── ...
│   ├── styles/                    # 样式文件
│   ├── types/                     # 类型定义
│   └── utils/                     # 工具函数
│       └── performance.ts         # 性能监控
│
├── src-tauri/                     # Rust 后端源码
│   ├── capabilities/              # Tauri 权限配置
│   ├── icons/                     # 应用图标
│   ├── src/
│   │   ├── commands/              # Tauri 命令层
│   │   ├── db/                    # 数据库层
│   │   │   ├── entities/          # SeaORM 实体
│   │   │   ├── migrator/          # 数据库迁移
│   │   │   └── seed/              # 种子数据
│   │   ├── repos/                 # 仓储层
│   │   │   ├── task_repo/
│   │   │   ├── project_repo/
│   │   │   └── ...
│   │   ├── services/              # 服务层
│   │   │   ├── task/
│   │   │   ├── project/
│   │   │   ├── sync/
│   │   │   └── ...
│   │   ├── types/                 # 类型定义
│   │   │   ├── dto.rs
│   │   │   └── error.rs
│   │   ├── lib.rs                 # 库入口
│   │   └── main.rs                # 主程序入口
│   ├── Cargo.toml
│   └── tauri.conf.json            # Tauri 配置
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 架构分层

### 前端架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Vue Pages  │  │   Features   │  │  Components  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ TanStack Query│  │    Pinia     │  │ Composables  │      │
│  │ (服务端状态)   │  │  (客户端状态) │  │  (业务逻辑)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Domain Types │  │   Services   │  │    Utils     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Tauri IPC   │  │    Router    │  │     i18n     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 后端架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Commands Layer                            │
│  - 参数接收和验证                                            │
│  - 错误类型转换                                              │
│  - 调用 Service 层                                           │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  - 业务编排                                                  │
│  - 事务管理                                                  │
│  - 业务规则                                                  │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer                            │
│  - 数据访问                                                  │
│  - 查询构建                                                  │
│  - 数据映射                                                  │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
│  - SeaORM 实体                                               │
│  - 数据库迁移                                                │
│  - 连接管理                                                  │
└─────────────────────────────────────────────────────────────┘
```

## 核心技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | 3.5.29 | UI 框架 |
| TypeScript | 5.9.3 | 类型系统 |
| TanStack Query | 5.92.9 | 服务端状态管理 |
| Pinia | 3.0.4 | 客户端状态管理 |
| Vue Router | 5.0.3 | 路由管理 |
| TailwindCSS | 4.2.1 | 样式框架 |
| Vite | 8.0.0 | 构建工具 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Rust | 2021 | 编程语言 |
| Tauri | 2 | 桌面应用框架 |
| SeaORM | 1.1 | ORM 框架 |
| SQLite | - | 嵌入式数据库 |
| Tokio | 1 | 异步运行时 |

## 数据流

### 查询流程

```
User Action
    ↓
Vue Component
    ↓
Composable (useProjectsQuery)
    ↓
TanStack Query (Cache)
    ↓
Service API (services/api/projects.ts)
    ↓
Tauri IPC (invoke)
    ↓
Command Layer (commands/projects.rs)
    ↓
Service Layer (services/project/)
    ↓
Repository Layer (repos/project_repo.rs)
    ↓
Database (SQLite)
```

### 更新流程

```
User Action
    ↓
Vue Component
    ↓
Mutation Hook (useMutation)
    ↓
Service API (services/api/projects.ts)
    ↓
Tauri IPC (invoke)
    ↓
Command Layer (commands/projects.rs)
    ↓
Service Layer (services/project/)
    ↓
Transaction Begin
    ↓
Repository Operations
    ↓
Transaction Commit
    ↓
Query Invalidation
    ↓
UI Refresh
```

## 状态管理

### TanStack Query（服务端状态）

```typescript
// 查询
const { data, isLoading, error } = useProjectsQuery({
  spaceId: props.spaceId
})

// 更新
const { mutate } = useProjectsMutations()
await mutate.updateProject({ id, title })

// 缓存失效
await invalidateProjects({ spaceId })
```

### Pinia（客户端状态）

```typescript
// UI 状态
const uiStore = useUIStore()
uiStore.selectProject(projectId)
uiStore.toggleSidebar()
```

## 错误处理

### 统一错误处理

```typescript
import { useErrorHandler } from '@/composables/base/useErrorHandler'

const { handleApiError, handleSuccess } = useErrorHandler()

// 在 mutation 中使用
useMutation({
  mutationFn: createTask,
  onError: handleApiError,
  onSuccess: () => handleSuccess('任务创建成功'),
})
```

## 性能优化

### 前端优化

- **虚拟滚动**：处理大列表渲染
- **懒加载**：按需加载组件和路由
- **缓存策略**：TanStack Query 智能缓存
- **防抖节流**：减少频繁操作

### 后端优化

- **索引优化**：数据库查询索引
- **批量操作**：减少数据库往返
- **连接池**：复用数据库连接
- **性能监控**：PerformanceTracker

## 测试策略

### 测试金字塔

```
         /\
        /  \  E2E 测试
       /----\
      /      \  集成测试
     /--------\
    /          \  单元测试
   /------------\
```

### 覆盖范围

- **Service 层**：90%+
- **Repository 层**：80%+
- **关键业务逻辑**：100%

## 安全考虑

### 数据安全

- Stronghold 加密存储敏感数据
- 本地数据库加密（规划中）
- 输入验证和清理

### 权限控制

- Tauri capabilities 配置
- 最小权限原则

## 部署架构

### 桌面应用

```
┌──────────────────────────────────┐
│        User Interface            │
│      (WebView / Vue 3)           │
└──────────────────────────────────┘
                 ▲
                 │ IPC
                 ▼
┌──────────────────────────────────┐
│      Rust Backend                │
│  ┌────────────────────────────┐  │
│  │   Commands / Services      │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │   Repositories             │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │   Database (SQLite)        │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

## 开发工作流

### 1. 功能开发

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发
bun run dev

# 3. 测试
bun test
cargo test

# 4. 代码检查
bun run lint
cargo clippy

# 5. 提交
git commit -m "feat: add new feature"

# 6. 推送
git push origin feature/new-feature

# 7. 创建 PR
gh pr create
```

### 2. 发布流程

```bash
# 1. 更新版本
bun run version:sync

# 2. 构建
bun run build

# 3. 发布
bun run release
```

## 监控与日志

### 前端监控

- Performance API
- PerformanceMonitor 工具类
- Vue DevTools

### 后端监控

- PerformanceTracker
- SQL 查询日志
- 应用日志

## 文档资源

- [状态管理迁移指南](./state-management-migration.md)
- [Service 层架构设计](./service-layer-architecture.md)
- [Feature 模块合并规划](./feature-modules-merge-plan.md)
- [错误处理使用指南](./error-handling-guide.md)
- [测试策略](./testing-strategy.md)
- [性能优化指南](./performance-optimization.md)
- [依赖注入改进](./dependency-injection.md)

## 贡献指南

### 代码规范

- 遵循 ESLint 和 Rustfmt 规则
- 编写有意义的提交信息
- 添加必要的测试
- 更新相关文档

### 审查清单

- [ ] 代码风格符合规范
- [ ] 类型定义完整
- [ ] 测试覆盖充分
- [ ] 文档已更新
- [ ] 性能无明显退化
- [ ] 无安全风险

## 常见问题

### Q: 如何调试 Tauri 应用？

A: 使用 Rust 日志和浏览器 DevTools：
```bash
RUST_LOG=debug bun run dev
# 然后在应用中打开 DevTools (F12)
```

### Q: 如何处理大量数据？

A: 使用虚拟滚动和分页：
```typescript
import { useVirtualizer } from '@tanstack/vue-virtual'
```

### Q: 如何优化数据库查询？

A: 添加索引和使用批量操作：
```rust
// 添加索引
manager.create_index(...)

// 批量操作
tasks::Entity::insert_many(active_models)
```

## 相关链接

- [Tauri 官方文档](https://tauri.app/)
- [Vue 3 文档](https://vuejs.org/)
- [SeaORM 文档](https://www.sea-ql.org/SeaORM/)
- [TanStack Query 文档](https://tanstack.com/query/latest)
