import { useRegisterShellHeader } from '@/app/shell-header'
import { useAppMotionPreset, useMotionPreset, withMotionDelay } from '@/composables/base/motion'

import TrashHeaderTabs from '../ui/TrashHeaderTabs.vue'
import { useTrashPage } from './useTrashPage'

export function useTrashPageFacade() {
	const loadingMotion = useAppMotionPreset('statusFeedback', 'sectionBase', 8)
	const contentMotion = useAppMotionPreset('drawerSection', 'sectionBase', 20)
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

	useRegisterShellHeader(
		{
			rightActions: TrashHeaderTabs,
		},
		'trash-page-actions',
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
