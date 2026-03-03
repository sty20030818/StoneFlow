import { useI18n } from 'vue-i18n'
import { computed, type Ref } from 'vue'

import { useDrawerActivityLogs } from '@/components/InspectorDrawer/shared/composables'
import { listInspectorActivityLogs } from '@/features/inspector'
import type { TaskDto } from '@/features/inspector/model'

export function useTaskInspectorActivityLogs(params: { currentTask: Ref<TaskDto | null> }) {
	const taskId = computed(() => params.currentTask.value?.id ?? null)
	const { t } = useI18n({ useScope: 'global' })
	return useDrawerActivityLogs({
		entityId: taskId,
		loadLogs: async (id) => {
			return await listInspectorActivityLogs({
				entityType: 'task',
				taskId: id,
			})
		},
		errorFallbackText: t('inspector.timeline.loadFailed'),
	})
}
