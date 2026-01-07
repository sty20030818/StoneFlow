import { onMounted, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'

import { completeTask, listTasks, type TaskDto } from '@/services/api/tasks'

/**
 * Space 任务数据加载与操作逻辑
 * @param spaceId 可选的 Space ID，传入则按 Space 筛选，不传则获取所有
 */
export function useSpaceTasks(spaceId?: MaybeRefOrGetter<string | undefined>) {
	const toast = useToast()

	const loading = ref(false)
	const doing = ref<TaskDto[]>([])
	const todo = ref<TaskDto[]>([])
	const doneToday = ref<TaskDto[]>([])

	function isTodayLocal(ts: number | null): boolean {
		if (!ts) return false
		const d = new Date(ts)
		const now = new Date()
		return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
	}

	async function refresh() {
		loading.value = true
		try {
			const sid = toValue(spaceId)
			const params = sid ? { spaceId: sid } : {}

			const [doingRows, todoRows, doneRows] = await Promise.all([
				listTasks({ ...params, status: 'doing' }),
				listTasks({ ...params, status: 'todo' }),
				listTasks({ ...params, status: 'done' }),
			])

			doing.value = doingRows
			todo.value = todoRows
			doneToday.value = doneRows.filter((t) => isTodayLocal(t.completed_at ?? null))
		} catch (e) {
			toast.add({
				title: '加载失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			loading.value = false
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

	// 监听 spaceId 变化时自动刷新
	watch(
		() => toValue(spaceId),
		() => {
			refresh()
		},
	)

	onMounted(async () => {
		await refresh()
	})

	return {
		loading,
		doing,
		todo,
		doneToday,
		refresh,
		onComplete,
	}
}
