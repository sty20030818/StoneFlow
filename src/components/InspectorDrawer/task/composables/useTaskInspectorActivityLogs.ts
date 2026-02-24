import { computed, type Ref } from 'vue'

import { listActivityLogs } from '@/services/api/logs'
import { useDrawerActivityLogs } from '@/components/InspectorDrawer/shared/composables'
import type { TaskDto } from '@/services/api/tasks'

export function useTaskInspectorActivityLogs(params: { currentTask: Ref<TaskDto | null>; taskTick: Ref<number> }) {
	const taskId = computed(() => params.currentTask.value?.id ?? null)
	return useDrawerActivityLogs({
		entityId: taskId,
		tick: params.taskTick,
		loadLogs: async (id) => {
			return await listActivityLogs({
				entityType: 'task',
				taskId: id,
			})
		},
		errorFallbackText: '加载操作日志失败',
	})
}
