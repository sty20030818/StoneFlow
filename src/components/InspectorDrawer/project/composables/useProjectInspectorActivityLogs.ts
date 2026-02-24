import { useI18n } from 'vue-i18n'
import { computed, type Ref } from 'vue'

import { listActivityLogs } from '@/services/api/logs'
import { useDrawerActivityLogs } from '@/components/InspectorDrawer/shared/composables'
import type { ProjectDto } from '@/services/api/projects'

export function useProjectInspectorActivityLogs(params: {
	currentProject: Ref<ProjectDto | null>
	projectTick: Ref<number>
}) {
	const projectId = computed(() => params.currentProject.value?.id ?? null)
	const { t } = useI18n({ useScope: 'global' })

	return useDrawerActivityLogs({
		entityId: projectId,
		tick: params.projectTick,
		loadLogs: async (id) => {
			return await listActivityLogs({
				entityType: 'project',
				projectId: id,
				limit: 50,
			})
		},
		errorFallbackText: t('inspector.project.timeline.loadFailed'),
	})
}
