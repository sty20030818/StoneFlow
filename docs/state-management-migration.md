# 状态管理重构迁移指南

## 重构目标

将服务端状态（projects, tasks等）从 Pinia 迁移到 TanStack Query，Pinia 仅保留纯客户端UI状态。

## 变更内容

### 1. 新增文件

- `src/features/workspace/model/useProjectsQuery.ts` - 使用 TanStack Query 管理 projects 数据
- `src/stores/ui.ts` - 简化的 UI 状态管理（选中项、展开/折叠等）
- `src/composables/base/useErrorHandler.ts` - 统一错误处理

### 2. 废弃文件

以下文件将在迁移完成后删除：

- `src/stores/projects.ts` - 被 `useProjectsQuery` 替代

### 3. 状态职责划分

#### TanStack Query 负责：
- Projects 数据
- Tasks 数据
- Spaces 数据
- 所有来自后端的数据

#### Pinia 负责：
- 选中项状态（selectedProjectId, selectedTaskId）
- UI 展开/折叠状态（sidebarCollapsed, detailPanelExpanded）
- 临时表单状态
- 用户偏好设置

## 迁移步骤

### 步骤1: 更新组件导入

**旧代码：**
```typescript
import { useProjectsStore } from '@/stores/projects'

const projectsStore = useProjectsStore()
const projects = projectsStore.projects
await projectsStore.load(spaceId)
```

**新代码：**
```typescript
import { useProjectsQuery } from '@/features/workspace'

const { data: projects, isLoading, error } = useProjectsQuery({
  spaceId: props.spaceId
})
```

### 步骤2: 更新错误处理

**旧代码：**
```typescript
try {
  await projectsStore.load(spaceId)
} catch (error) {
  console.error(error)
  // 手动处理错误
}
```

**新代码：**
```typescript
import { useErrorHandler } from '@/composables/base/useErrorHandler'

const { handleApiError } = useErrorHandler()

const { data, error } = useProjectsQuery({ spaceId })
if (error.value) {
  handleApiError(error.value)
}
```

### 步骤3: 更新 UI 状态访问

**旧代码：**
```typescript
// 在某个组件中
const selectedProjectId = ref(null)
```

**新代码：**
```typescript
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
const selectedProjectId = uiStore.selectedProjectId
```

### 步骤4: 更新数据修改操作

**旧代码：**
```typescript
await projectsStore.patchProject(spaceId, projectId, { title: 'New Title' })
```

**新代码：**
```typescript
import { useProjectsMutations } from '@/features/workspace'

const { invalidateProjects } = useProjectsMutations()

// 执行更新操作后
await updateProject({ projectId, title: 'New Title' })
await invalidateProjects({ spaceId })
```

## 需要迁移的文件列表

### 高优先级
- [ ] `src/pages/workspace/*.vue` - 工作区页面
- [ ] `src/features/workspace/ui/**/*.vue` - workspace UI 组件
- [ ] `src/features/inspector/**/*.vue` - 详情面板组件

### 中优先级
- [ ] `src/features/create-flow/**/*.vue` - 创建流程组件
- [ ] `src/features/review/**/*.vue` - 回顾功能组件

### 低优先级
- [ ] 其他间接使用 projects store 的组件

## 迁移检查清单

完成迁移后，请确认：

- [ ] 组件不再导入 `useProjectsStore`
- [ ] 使用 `useProjectsQuery` 或相关 hooks 获取数据
- [ ] 使用 `useUIStore` 管理 UI 状态
- [ ] 错误处理使用 `useErrorHandler`
- [ ] 数据修改后正确调用 `invalidateProjects`

## 常见问题

### Q: 为什么要移除 projects store？

A: Projects store 存在以下问题：
1. 手动管理缓存和同步，容易出错
2. 与 TanStack Query 功能重复
3. 违反单一数据源原则

### Q: 迁移后性能会受影响吗？

A: 不会。TanStack Query 自带：
- 智能缓存机制
- 请求去重
- 后台自动刷新
- 更好的用户体验

### Q: 旧代码还能用吗？

A: 可以，但建议尽快迁移。旧代码将在所有组件迁移完成后移除。

## 时间线

- **第1周**: 迁移核心页面和组件
- **第2周**: 迁移次要组件，移除旧代码
- **第3周**: 测试和优化

## 支持与反馈

如有问题，请：
1. 查阅本文档
2. 参考已迁移的组件示例
3. 向团队提问
