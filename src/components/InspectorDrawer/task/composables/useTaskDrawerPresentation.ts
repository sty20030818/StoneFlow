import { computed, type Ref } from 'vue'

import type { TaskDto } from '@/services/api/tasks'
import {
	formatDrawerDateTime,
	useDrawerSaveStatePresentation,
	type DrawerSaveState,
} from '@/components/InspectorDrawer/shared/composables'

export function useTaskDrawerPresentation(params: {
	currentTask: Ref<TaskDto | null>
	saveState: Ref<DrawerSaveState>
}) {
	const { saveStateVisible } = useDrawerSaveStatePresentation(params.saveState)

	const createdAtFooterLabel = computed(() => {
		return formatDrawerDateTime(params.currentTask.value?.createdAt, {
			fallback: '创建时间未知',
			includeWeekday: true,
		})
	})

	return {
		saveStateVisible,
		createdAtFooterLabel,
	}
}
