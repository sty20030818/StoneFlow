import { refDebounced } from '@vueuse/core'
import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'

import { useTaskSnapshotState } from '@/composables/domain/task/useTaskSnapshotState'
import { completeTask, listTasks, type TaskDto } from '@/services/api/tasks'

/**
 * Space 任务数据加载与操作逻辑
 * @param spaceId 可选的 Space ID，传入则按 Space 筛选，不传则获取所有
 * @param projectId 可选的 Project ID，传入则按 Project 筛选
 */
export function useSpaceTasks(
	spaceId?: MaybeRefOrGetter<string | undefined>,
	projectId?: MaybeRefOrGetter<string | null | undefined>,
) {
	const toast = useToast()

	const loading = ref(true)
	const todo = ref<TaskDto[]>([])
	const doneToday = ref<TaskDto[]>([])
	const { loadedSpaceScopes, spaceSnapshots: snapshotByScope } = useTaskSnapshotState()

	const scopeKey = computed(() => {
		const sid = toValue(spaceId) ?? '_all_spaces'
		const pid = toValue(projectId) ?? '_all_projects'
		return `${sid}::${pid}`
	})
	const debouncedScopeKey = refDebounced(scopeKey, 80)

	function isTodayLocal(ts: number | null): boolean {
		if (!ts) return false
		const d = new Date(ts)
		const now = new Date()
		return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
	}

	/**
	 * 刷新任务列表。
	 * @param silent 为 true 时不置 loading，避免切换 project/space 时列内容闪烁
	 */
	async function refresh(silent = false) {
		const nextScopeKey = scopeKey.value
		const useSilent = silent && loadedSpaceScopes.value.has(nextScopeKey)
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

			todo.value = todoRows
			const doneRowsToday = doneRows.filter((t) => t.doneReason !== 'cancelled' && isTodayLocal(t.completedAt ?? null))
			doneToday.value = doneRowsToday
			snapshotByScope.value = {
				...snapshotByScope.value,
				[nextScopeKey]: { todo: todoRows, doneToday: doneRowsToday },
			}
		} catch (e) {
			toast.add({
				title: '加载失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			loadedSpaceScopes.value = new Set(loadedSpaceScopes.value).add(nextScopeKey)
			if (!useSilent) loading.value = false
		}
	}

	async function onComplete(taskId: string) {
		try {
			await completeTask(taskId)
			toast.add({ title: '已完成', color: 'success' })
			await refresh()
		} catch (e) {
			toast.add({
				title: '完成失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		}
	}

	// 监听 spaceId 和 projectId 变化时自动刷新（静默，不闪烁）
	watch(
		debouncedScopeKey,
		() => {
			const snapshot = snapshotByScope.value[debouncedScopeKey.value]
			if (snapshot) {
				todo.value = snapshot.todo
				doneToday.value = snapshot.doneToday
				loading.value = false
				loadedSpaceScopes.value = new Set(loadedSpaceScopes.value).add(debouncedScopeKey.value)
				void refresh(true)
				return
			}
			void refresh(false)
		},
		{ immediate: true },
	)

	return {
		loading,
		todo,
		doneToday,
		refresh,
		onComplete,
	}
}
