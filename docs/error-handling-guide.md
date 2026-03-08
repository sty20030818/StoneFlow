# 统一错误处理机制使用指南

## 概述

本项目已实现统一的错误处理机制，位于 `src/composables/base/useErrorHandler.ts`。

## 核心功能

### 1. 错误类型识别

```typescript
import { isApiError, type ApiError } from '@/composables/base/useErrorHandler'

// 判断是否为 API 错误
if (isApiError(error)) {
  console.log(error.code)    // 错误码
  console.log(error.message) // 错误消息
}
```

### 2. 统一错误处理 Hook

```typescript
import { useErrorHandler } from '@/composables/base/useErrorHandler'

const { handleApiError, handleSuccess } = useErrorHandler()

// 处理错误
handleApiError(error, '操作失败，请重试')

// 显示成功提示
handleSuccess('操作成功')
```

## 使用场景

### 场景1: Vue Query 错误处理

```typescript
import { useQuery } from '@tanstack/vue-query'
import { useErrorHandler } from '@/composables/base/useErrorHandler'

const { handleApiError } = useErrorHandler()

const { data, error } = useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
})

// 在 watch 或 computed 中处理错误
watch(error, (newError) => {
  if (newError) {
    handleApiError(newError, '加载任务失败')
  }
})
```

### 场景2: Mutation 错误处理

```typescript
import { useMutation } from '@tanstack/vue-query'
import { useErrorHandler } from '@/composables/base/useErrorHandler'

const { handleApiError, handleSuccess } = useErrorHandler()

const { mutate } = useMutation({
  mutationFn: createTask,
  onError: (error) => {
    handleApiError(error, '创建任务失败')
  },
  onSuccess: () => {
    handleSuccess('任务创建成功')
  },
})
```

### 场景3: 异步函数错误处理

```typescript
import { useErrorHandler } from '@/composables/base/useErrorHandler'

const { handleApiError } = useErrorHandler()

async function handleSubmit() {
  try {
    await saveTask(taskData)
    // 成功逻辑
  } catch (error) {
    handleApiError(error, '保存失败')
  }
}
```

### 场景4: Promise 错误处理

```typescript
import { useErrorHandler } from '@/composables/base/useErrorHandler'

const { handleApiError } = useErrorHandler()

someAsyncOperation()
  .then((result) => {
    // 成功逻辑
  })
  .catch((error) => {
    handleApiError(error)
  })
```

## 错误码国际化

### 1. 定义错误消息

在 `src/i18n/locales/zh-CN.ts` 和 `en-US.ts` 中添加：

```typescript
export default {
  errors: {
    unknown: '未知错误',
    network_error: '网络错误，请检查网络连接',
    validation_error: '数据验证失败',
    unauthorized: '未授权，请先登录',
    forbidden: '没有权限执行此操作',
    not_found: '请求的资源不存在',
    // 添加更多错误码...
  },
}
```

### 2. 使用错误码

```typescript
// 后端返回
{
  code: 'validation_error',
  message: '标题不能为空'
}

// 前端处理
handleApiError(error) // 自动使用 errors.validation_error
```

## 最佳实践

### ✅ 推荐

```typescript
// 1. 使用统一的错误处理
const { handleApiError } = useErrorHandler()
handleApiError(error, '加载失败')

// 2. 在 onError 回调中处理
useMutation({
  mutationFn: updateTask,
  onError: (error) => handleApiError(error),
})

// 3. 提供有意义的 fallback 消息
handleApiError(error, '无法连接到服务器，请稍后重试')
```

### ❌ 避免

```typescript
// 1. 不要直接 console.error
console.error(error) // ❌

// 2. 不要重复实现错误处理
if (error) {
  alert(error.message) // ❌
}

// 3. 不要忽略错误
await someOperation().catch(() => {}) // ❌
```

## 迁移指南

### 步骤1: 识别现有错误处理

查找项目中的错误处理代码：

```bash
grep -r "catch.*error" src/
```

### 步骤2: 替换为统一处理

**旧代码**：
```typescript
try {
  await createProject(data)
} catch (error) {
  console.error(error)
  alert('创建失败')
}
```

**新代码**：
```typescript
import { useErrorHandler } from '@/composables/base/useErrorHandler'

const { handleApiError, handleSuccess } = useErrorHandler()

try {
  await createProject(data)
  handleSuccess('项目创建成功')
} catch (error) {
  handleApiError(error, '创建项目失败')
}
```

### 步骤3: 批量更新

对于使用 TanStack Query 的代码：

**旧代码**：
```typescript
const { mutate } = useMutation({
  mutationFn: deleteTask,
  onError: (error) => {
    console.error(error)
    alert('删除失败')
  },
})
```

**新代码**：
```typescript
const { handleApiError, handleSuccess } = useErrorHandler()

const { mutate } = useMutation({
  mutationFn: deleteTask,
  onError: handleApiError,
  onSuccess: () => handleSuccess('删除成功'),
})
```

## 错误处理策略

### 1. 自动重试

对于网络错误，可以配置自动重试：

```typescript
useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
  retry: 3, // 失败后重试 3 次
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
})
```

### 2. 错误边界

对于关键功能，使用错误边界：

```vue
<template>
  <ErrorBoundary @error="handleApiError">
    <TaskList />
  </ErrorBoundary>
</template>
```

### 3. 优雅降级

```typescript
const { data, error, isError } = useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
})

if (isError) {
  // 显示降级 UI
  return <EmptyState message="加载失败，请刷新重试" />
}
```

## 监控与日志

### 1. 错误日志

所有错误都会自动记录到控制台：

```typescript
console.error('API Error:', error)
```

### 2. 错误上报（可选）

可以在 `handleApiError` 中集成错误上报服务：

```typescript
const handleApiError = (error: unknown, fallbackMessage?: string) => {
  console.error('API Error:', error)
  
  // 上报到 Sentry / LogRocket 等
  // captureException(error)
  
  // 显示用户提示
  // ...
}
```

## 检查清单

完成错误处理迁移后，确认：

- [ ] 所有 `catch` 块使用 `handleApiError`
- [ ] 所有 `onError` 回调使用统一处理
- [ ] 错误消息支持国际化
- [ ] 移除 `console.error` 和 `alert`
- [ ] 提供有意义的 fallback 消息
- [ ] 关键操作有成功提示

## 相关文档

- [状态管理迁移指南](./state-management-migration.md)
- [Feature 模块合并规划](./feature-modules-merge-plan.md)
- [Service 层架构设计](./service-layer-architecture.md)
