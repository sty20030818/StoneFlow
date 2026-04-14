import { useI18n } from 'vue-i18n'
import { computed, type Ref } from 'vue'

import { useDrawerActivityLogs } from '../shared'
import { listInspectorActivityLogs } from '../../queries'
import type { InspectorTask } from '../../model'

export function useTaskInspectorActivityLogs(params: { currentTask: Ref<InspectorTask | null> }) {
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
