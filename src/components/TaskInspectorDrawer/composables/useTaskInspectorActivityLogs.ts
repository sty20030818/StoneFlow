import { useAsyncState } from '@vueuse/core'
import { computed, watch, type Ref } from 'vue'

import { listActivityLogs, type ActivityLogEntry } from '@/services/api/logs'
import type { TaskDto } from '@/services/api/tasks'

export function useTaskInspectorActivityLogs(params: {
	currentTask: Ref<TaskDto | null>
	taskTick: Ref<number>
}) {
	const taskId = computed(() => params.currentTask.value?.id ?? null)

	const {
		state: timelineLogs,
		isLoading: timelineLoading,
		error: timelineError,
		execute,
	} = useAsyncState(
		async (id: string) =>
			await listActivityLogs({
				entityType: 'task',
				taskId: id,
			}),
		[] as ActivityLogEntry[],
		{
			immediate: false,
			resetOnExecute: false,
		},
	)

	const timelineErrorMessage = computed(() => {
		if (!taskId.value) return null
		const error = timelineError.value
		if (!error) return null
		return error instanceof Error ? error.message : '加载操作日志失败'
	})

	const timelineEmpty = computed(() => {
		return !timelineLoading.value && !timelineError.value && timelineLogs.value.length === 0
	})

	async function reloadTimeline() {
		const id = taskId.value
		if (!id) {
			timelineLogs.value = []
			return
		}
		await execute(0, id)
	}

	watch(
		taskId,
		() => {
			void reloadTimeline()
		},
		{ immediate: true },
	)

	watch(
		() => params.taskTick.value,
		() => {
			if (!taskId.value) return
			void reloadTimeline()
		},
	)

	return {
		timelineLogs,
		timelineLoading,
		timelineErrorMessage,
		timelineEmpty,
		reloadTimeline,
	}
}
