import { onMounted, ref } from 'vue'

import { completeTask, listTasks, type TaskDto } from '@/services/api/tasks'

/**
 * AllTasks 任务数据加载与操作逻辑
 */
export function useAllTasks() {
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

	function spaceLabel(spaceId: string): string {
		const labels: Record<string, string> = {
			work: 'Work',
			personal: 'Personal',
			study: 'Study',
		}
		return labels[spaceId] ?? spaceId
	}

	async function refresh() {
		loading.value = true
		try {
			const [doingRows, todoRows, doneRows] = await Promise.all([
				listTasks({ status: 'doing' }),
				listTasks({ status: 'todo' }),
				listTasks({ status: 'done' }),
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

	onMounted(async () => {
		await refresh()
	})

	return {
		loading,
		doing,
		todo,
		doneToday,
		spaceLabel,
		refresh,
		onComplete,
	}
}
