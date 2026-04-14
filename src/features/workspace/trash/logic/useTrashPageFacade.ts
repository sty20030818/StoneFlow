import { computed } from 'vue'

import { useRegisterAppHeader } from '@/app/layout/header'
import {
	useAppContentMotionPreset,
	useAppInteractionMotionPreset,
	useMotionPreset,
	withMotionDelay,
} from '@/shared/composables/base/motion'
import { DEFAULT_SPACE_DISPLAY, SPACE_DISPLAY } from '@/shared/config/space'
import { useSettingsStore } from '@/app/stores/settings'

import TrashHeaderTabs from '../ui/TrashHeaderTabs.vue'
import { useTrashPage } from './useTrashPage'

export function useTrashPageFacade() {
	const settingsStore = useSettingsStore()
	const loadingMotion = useAppInteractionMotionPreset('statusFeedback', 'sectionBase', 8)
	const contentMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 20)
	const listItemMotion = useMotionPreset('listItem')
	const {
		t,
		viewMode,
		loading,
		deletedProjects,
		deletedTasks,
		restoringProjectIds,
		restoringTaskIds,
		getTaskProjectLabel,
		restoreProjectItem,
		restoreTaskItem,
	} = useTrashPage()

	useRegisterAppHeader(
		computed(() => {
			const currentSpaceId = settingsStore.settings.activeSpaceId
			const display = SPACE_DISPLAY[currentSpaceId] ?? DEFAULT_SPACE_DISPLAY

			return {
				leading: {
					label: display.label,
					icon: display.icon,
					pillClass: display.pillClass,
					to: `/space/${currentSpaceId}`,
				},
				breadcrumb: [
					{
						label: t('nav.pages.trash.title'),
					},
				],
				center: TrashHeaderTabs,
			}
		}),
		'trash-shell',
	)

	const projectItemMotionCache = new Map<string, number>()
	const taskItemMotionCache = new Map<string, number>()

	function getProjectItemMotion(projectId: string) {
		const cached = projectItemMotionCache.get(projectId)
		if (typeof cached === 'number') return withMotionDelay(listItemMotion.value, cached)
		const delay = 56 + projectItemMotionCache.size * 18
		projectItemMotionCache.set(projectId, delay)
		return withMotionDelay(listItemMotion.value, delay)
	}

	function getTaskItemMotion(taskId: string) {
		const cached = taskItemMotionCache.get(taskId)
		if (typeof cached === 'number') return withMotionDelay(listItemMotion.value, cached)
		const delay = 56 + taskItemMotionCache.size * 18
		taskItemMotionCache.set(taskId, delay)
		return withMotionDelay(listItemMotion.value, delay)
	}

	return {
		t,
		loadingMotion,
		contentMotion,
		viewMode,
		loading,
		deletedProjects,
		deletedTasks,
		restoringProjectIds,
		restoringTaskIds,
		getTaskProjectLabel,
		restoreProjectItem,
		restoreTaskItem,
		getProjectItemMotion,
		getTaskItemMotion,
	}
}
