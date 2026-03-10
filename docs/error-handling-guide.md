# 统一错误处理指南

## 概述

本项目当前的错误处理不是“所有错误都交给一个 Hook”，而是采用更贴近业务的分层方式：

- 错误文案解析：`src/utils/error-message.ts`
- 错误码到国际化 key 的映射：`src/i18n/error-codes.ts`
- 主动操作反馈封装：`src/composables/base/useErrorHandler.ts`
- 查询加载失败分级反馈：`src/composables/base/useLoadErrorFeedback.ts`

推荐原则：

- 同一份错误码映射只维护一处，避免重复定义。
- 错误处理要区分场景，不要把所有错误都统一弹 toast。
- 页面层优先消费“可读文案”，不要直接拼接底层异常对象。

## 当前推荐方案

### 1. 先解析错误，再决定怎么反馈

统一使用 `resolveErrorMessage` 把 `unknown` 转成可展示文案：

```typescript
import { resolveErrorMessage } from '@/utils/error-message'

const message = resolveErrorMessage(error, t)
```

解析顺序如下：

1. 如果错误对象里带有 `code`，优先按错误码映射国际化文案。
2. 如果没有可识别错误码，则回退到 `Error.message` 或字符串错误。
3. 如果仍然拿不到可展示文案，则使用兜底文案 `fallback.unknownError`。

### 2. 错误码国际化以 `errors.codes.*` 为唯一入口

错误码映射由 `src/i18n/error-codes.ts` 统一维护，例如：

```typescript
const API_ERROR_CODE_TO_I18N_KEY = {
	VALIDATION_ERROR: 'errors.codes.VALIDATION_ERROR',
	DB_ERROR: 'errors.codes.DB_ERROR',
	INTERNAL_ERROR: 'errors.codes.INTERNAL_ERROR',
} as const
```

对应文案放在语言包中：

```typescript
export default {
	errors: {
		codes: {
			VALIDATION_ERROR: '参数不合法，请检查输入后重试',
			DB_ERROR: '数据库操作失败，请稍后重试',
			INTERNAL_ERROR: '系统内部错误，请稍后重试',
		},
	},
	fallback: {
		unknownError: '未知错误',
	},
}
```

不推荐再额外引入 `errors.validation_error`、`errors.network_error` 这一类平行结构，否则会和现有映射重复。

### 3. `useErrorHandler` 适合主动操作反馈，不是所有场景的总入口

对于“点击按钮后执行一个动作”这类简单交互，可以使用：

```typescript
import { useErrorHandler } from '@/composables/base/useErrorHandler'

const { handleApiError, handleSuccess, handleValidationError } = useErrorHandler()

try {
	await saveTask(taskData)
	handleSuccess('保存成功')
} catch (error) {
	handleApiError(error, {
		title: '保存失败',
	})
}
```

当前 `useErrorHandler` 还额外提供：

- `handleApiError`：适合主动操作失败，支持 `title`、`fallbackMessage` 与自定义描述
- `handleSuccess`：适合标准化成功提示
- `handleValidationError`：当前作为表单校验过渡封装使用

但以下场景不建议只靠 `handleApiError`：

- 表单字段校验错误
- 首屏或列表加载失败
- 自动同步、轮询、后台任务失败
- 需要页面级降级态而不是 toast 的场景

## 场景化处理建议

### 场景 1：用户主动触发的异步操作

适用于创建、保存、删除、复制、打开路径等显式操作。推荐做法是：

- 成功时给明确成功提示
- 失败时给固定标题，由 `handleApiError` 自动补充统一解析后的描述

```typescript
import { useErrorHandler } from '@/composables/base/useErrorHandler'

const { handleApiError, handleSuccess } = useErrorHandler()

async function onSave() {
	try {
		await createProject(data)
		handleSuccess('创建成功')
	} catch (error) {
		handleApiError(error, {
			title: '创建失败',
		})
	}
}
```

对于复制、打开外部链接、打开本地路径等动作，同样推荐走 `useErrorHandler`，避免页面层重复拼装 title/description：

```typescript
const { handleApiError } = useErrorHandler()

async function openPath(path: string) {
	try {
		await openLocalPath(path)
	} catch (error) {
		handleApiError(error, {
			title: '打开失败',
		})
	}
}
```

这类写法和当前项目多数页面实现保持一致，适合需要自定义标题和描述的业务操作。

### 场景 2：`@pinia/colada` 查询失败

当前项目查询栈是 `@pinia/colada`，不是 `@tanstack/vue-query`。当前推荐通过 `useLoadErrorFeedback` 把“提示用户”和“页面降级”拆开处理。

```typescript
import { useQuery } from '@pinia/colada'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useLoadErrorFeedback } from '@/composables/base/useLoadErrorFeedback'

const { t } = useI18n({ useScope: 'global' })

const tasksQuery = useQuery({
	key: () => ['tasks'],
	query: async () => await listTasks(),
})

const tasks = computed(() => tasksQuery.data.value ?? [])
const { loadErrorMessage, showLoadErrorState } = useLoadErrorFeedback({
	error: tasksQuery.error,
	hasData: computed(() => tasks.value.length > 0),
	loading: tasksQuery.isLoading,
	toastTitle: computed(() => t('task.toast.loadFailedTitle')),
})
```

模板层优先做降级展示：

```vue
<template>
	<EmptyState
		v-if="showLoadErrorState"
		text="加载失败"
		icon="i-lucide-triangle-alert"
		stacked>
		<p>{{ loadErrorMessage }}</p>
		<UButton @click="refresh">
			重试
		</UButton>
	</EmptyState>
	<TaskList
		v-else
		:items="tasks"
	/>
</template>
```

原则是：

- 首屏空数据失败，优先页面级降级态。
- 已有缓存或旧数据时，可以只提示 toast，不必强制替换整个页面。

### 场景 3：`useAsyncState` 加载失败

项目中很多页面使用 `@vueuse/core` 的 `useAsyncState`。当前推荐做法是：单独记录 `loadError`，成功时清空，再交给 `useLoadErrorFeedback` 统一处理。

```typescript
const loadError = ref<unknown | null>(null)

const { state, isLoading, execute } = useAsyncState(() => listAssetNotes(), [], {
	immediate: true,
	resetOnExecute: false,
	onSuccess: () => {
		loadError.value = null
	},
	onError: (error) => {
		loadError.value = error
	},
})

const { loadErrorMessage, showLoadErrorState } = useLoadErrorFeedback({
	error: loadError,
	hasData: computed(() => state.value.length > 0),
	loading: isLoading,
	toastTitle: computed(() => t('assets.notes.toast.loadFailedTitle')),
})
```

如果该页面允许局部降级，也应搭配空状态或重试入口，而不是只保留 toast。

### 场景 4：表单校验失败

理想情况下，表单校验错误应优先走字段级或表单级承接。当前共享层已经提供 `handleValidationError` 作为过渡封装，用于减少散落的校验 toast 逻辑，但它不应替代真正的字段级校验展示。

1. 字段级校验提示
2. 表单级校验提示
3. 过渡阶段可使用 `handleValidationError`

例如当前项目里已经有 `validateWithZod` 返回可直接展示的校验文案，这种情况应直接消费校验结果，而不是再次包装成通用异常。

### 场景 5：后台任务或自动同步失败

自动同步、轮询、后台初始化失败，不建议每次都弹全局 toast。更合适的做法是：

- 页面上展示状态标识
- 记录错误日志
- 只在用户可感知的关键失败点提示一次

这样可以避免频繁打断用户。

## 反模式

以下做法应避免：

```typescript
console.error(error)
alert(error.message)
await someOperation().catch(() => {})
```

问题分别是：

- `console.error` 不能替代用户反馈
- `alert` 会破坏当前 UI 交互体验
- 静默吞错会让状态与数据不一致，更难排查

## 迁移建议

### 步骤 1：优先识别重复错误处理代码

可以先搜索以下模式：

```bash
rg -n "catch \\(error\\)|catch \\(e\\)|onError:|toast\\.add\\(|alert\\(|console\\.error\\(" src
```

### 步骤 2：主动操作优先收敛到 `useErrorHandler`

旧代码：

```typescript
try {
	await createProject(data)
} catch (error) {
	console.error(error)
	alert('创建失败')
}
```

新代码：

```typescript
const { handleApiError, handleSuccess } = useErrorHandler()

try {
	await createProject(data)
	handleSuccess('创建成功')
} catch (error) {
	handleApiError(error, {
		title: '创建失败',
	})
}
```

### 步骤 3：查询加载失败收敛到 `useLoadErrorFeedback`

如果是读取链路，不要直接在页面里手写 `watch(error) + toast`，优先：

- 在 composable 内部组合 `error`、`hasData`、`loading`
- 使用 `useLoadErrorFeedback`
- 在页面层消费 `showLoadErrorState` 和 `refresh`

### 步骤 4：保持错误码映射单一事实来源

当后端新增错误码时，只做两处更新：

1. `src/i18n/error-codes.ts`
2. 对应语言包中的 `errors.codes.*`

不要在业务页面里硬编码新的错误码分支。

## 日志与后续扩展

当前项目里部分模块已经保留了 `logError` 之类的日志入口，但很多实现仍是占位式封装。后续如果要接入 Sentry、LogRocket 或本地持久化日志，建议放在以下位置之一：

- `resolveErrorMessage` 之外的独立日志层
- `useErrorHandler` 内部的统一上报钩子
- 后台任务和同步模块的专用日志入口

注意：

- 用户提示和错误上报是两个职责，不要混在一个分支里硬编码。
- 上报前应明确哪些错误需要过滤，避免把用户取消、字段校验等正常分支当成异常。

## 检查清单

完成迁移后，至少确认以下几点：

- [ ] 错误文案统一通过 `resolveErrorMessage` 解析
- [ ] 错误码统一映射到 `errors.codes.*`
- [ ] 查询加载失败具备页面级降级方案
- [ ] 用户主动操作失败具备明确 toast 提示
- [ ] 表单校验错误没有被滥用为全局异常
- [ ] 没有新增 `alert` 或静默吞错代码

## 相关文件

- `src/utils/error-message.ts`
- `src/i18n/error-codes.ts`
- `src/composables/base/useErrorHandler.ts`
