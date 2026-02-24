import { useI18n } from 'vue-i18n'
import { refDebounced } from '@vueuse/core'
import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'

import { useRuntimeGate } from '@/composables/base/runtime-gate'
import { useTaskSnapshotState } from '@/composables/domain/task/useTaskSnapshotState'
import { useTaskActions } from '@/composables/useTaskActions'
import { listTasks, type TaskDto } from '@/services/api/tasks'
import { useRefreshSignalsStore } from '@/stores/refresh-signals'

/**
 * 统一的项目任务数据加载与操作逻辑
 * 支持两种模式：
 * 1. All Tasks: projectId=undefined（可选 spaceId，用于按 Space 过滤）
 * 2. Project: spaceId 有值, projectId 有值
 *
 * @param spaceId 可选的 Space ID，传入则按 Space 筛选，不传则获取所有
 * @param projectId 可选的 Project ID，传入则按 Project 筛选
 */
export function useProjectTasks(
	spaceId?: MaybeRefOrGetter<string | undefined>,
	projectId?: MaybeRefOrGetter<string | null | undefined>,
) {
	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })
	const refreshSignals = useRefreshSignalsStore()
	const { canBackgroundRefresh } = useRuntimeGate()

	const loading = ref(true)
	const todo = ref<TaskDto[]>([])
	const doneAll = ref<TaskDto[]>([])
	const { loadedProjectScopes, projectSnapshots: snapshotByScope, setProjectSnapshot } = useTaskSnapshotState()
	let latestRequestId = 0

	const scopeKey = computed(() => {
		const sid = toValue(spaceId) ?? '_all_spaces'
		const pid = toValue(projectId) ?? '_all_projects'
		return `${sid}::${pid}`
	})
	const debouncedScopeKey = refDebounced(scopeKey, 80)

	/**
	 * 刷新任务列表。
	 * @param silent 为 true 时不置 loading，避免切换 project/space 时列内容闪烁
	 */
	async function refresh(silent = false) {
		const nextScopeKey = scopeKey.value
		const requestId = ++latestRequestId
		const useSilent = silent && loadedProjectScopes.value.has(nextScopeKey)
		if (!useSilent) loading.value = true
		try {
			const sid = toValue(spaceId)
			const pid = toValue(projectId)
			const params: { spaceId?: string; projectId?: string | null } = {}
			if (sid) params.spaceId = sid
			if (pid !== undefined && pid !== null) params.projectId = pid

			const [todoRows, doneRows] = await Promise.all([
				listTasks({ ...params, status: 'todo' }),
				listTasks({ ...params, status: 'done' }),
			])
			// 只接受当前作用域的最新请求结果，避免旧请求覆盖新视图。
			if (requestId !== latestRequestId || nextScopeKey !== scopeKey.value) return

			todo.value = todoRows
			doneAll.value = doneRows
			setProjectSnapshot(nextScopeKey, { todo: todoRows, doneAll: doneRows })
		} catch (e) {
			if (requestId !== latestRequestId || nextScopeKey !== scopeKey.value) return
			toast.add({
				title: t('projectView.toast.loadFailedTitle'),
				description: e instanceof Error ? e.message : t('fallback.unknownError'),
				color: 'error',
			})
		} finally {
			if (requestId !== latestRequestId || nextScopeKey !== scopeKey.value) return
			loadedProjectScopes.value = new Set(loadedProjectScopes.value).add(nextScopeKey)
			if (!useSilent) loading.value = false
		}
	}

	const { complete } = useTaskActions()

	async function onComplete(taskId: string) {
		const success = await complete(taskId)
		if (success) {
			await refresh()
		}
	}

	// 监听 spaceId 和 projectId 变化时自动刷新（静默，不闪烁）
	watch(
		debouncedScopeKey,
		() => {
			const snapshot = snapshotByScope.value[debouncedScopeKey.value]
			if (snapshot) {
				todo.value = snapshot.todo
				doneAll.value = snapshot.doneAll
				loading.value = false
				loadedProjectScopes.value = new Set(loadedProjectScopes.value).add(debouncedScopeKey.value)
				void refresh(true)
				return
			}
			void refresh(false)
		},
		{ immediate: true },
	)

	// 监听任务刷新信号，确保创建/更新后列数据一致（静默刷新）
	watch(
		() => refreshSignals.taskTick,
		() => {
			if (!canBackgroundRefresh.value) return
			void refresh(true)
		},
	)

	return {
		loading,
		todo,
		doneAll,
		refresh,
		onComplete,
	}
}
