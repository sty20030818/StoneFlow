import { useI18n } from 'vue-i18n'
import { computed, type Ref } from 'vue'

import { useDrawerActivityLogs } from '@/components/InspectorDrawer/shared/composables'
import { listInspectorActivityLogs } from '@/features/inspector'
import type { ProjectDto } from '@/features/inspector/model'

export function useProjectInspectorActivityLogs(params: {
	currentProject: Ref<ProjectDto | null>
}) {
	const projectId = computed(() => params.currentProject.value?.id ?? null)
	const { t } = useI18n({ useScope: 'global' })

	return useDrawerActivityLogs({
		entityId: projectId,
		loadLogs: async (id) => {
			return await listInspectorActivityLogs({
				entityType: 'project',
				projectId: id,
				limit: 50,
			})
		},
		errorFallbackText: t('inspector.project.timeline.loadFailed'),
	})
}
