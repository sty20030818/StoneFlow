import { onMounted, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'

import { useTaskActions } from '@/composables/useTaskActions'
import { listTasks, type TaskDto } from '@/services/api/tasks'

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

	const loading = ref(false)
	const doing = ref<TaskDto[]>([])
	const todo = ref<TaskDto[]>([])
	const doneAll = ref<TaskDto[]>([])

	/**
	 * 刷新任务列表。
	 * @param silent 为 true 时不置 loading，避免切换 project/space 时三列框闪 skeleton
	 */
	async function refresh(silent = false) {
		if (!silent) loading.value = true
		try {
			const sid = toValue(spaceId)
			const pid = toValue(projectId)
			const params: { spaceId?: string; projectId?: string | null } = {}
			if (sid) params.spaceId = sid
			if (pid !== undefined && pid !== null) params.projectId = pid

			const [doingRows, todoRows, doneRows] = await Promise.all([
				listTasks({ ...params, status: 'doing' }),
				listTasks({ ...params, status: 'todo' }),
				listTasks({ ...params, status: 'done' }),
			])

			doing.value = doingRows
			todo.value = todoRows
			doneAll.value = doneRows
		} catch (e) {
			toast.add({
				title: '加载失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			if (!silent) loading.value = false
		}
	}

	const { complete } = useTaskActions()

	async function onComplete(taskId: string) {
		const success = await complete(taskId)
		if (success) {
			await refresh()
		}
	}

	// 监听 spaceId 和 projectId 变化时自动刷新（静默，不闪 skeleton）
	watch(
		() => [toValue(spaceId), toValue(projectId)],
		() => {
			refresh(true)
		},
	)

	onMounted(async () => {
		await refresh()
	})

	return {
		loading,
		doing,
		todo,
		doneAll,
		refresh,
		onComplete,
	}
}
