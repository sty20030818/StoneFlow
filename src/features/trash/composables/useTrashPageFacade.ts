import { computed } from 'vue'

import { useAppMotionPreset, useMotionPreset, withMotionDelay } from '@/composables/base/motion'

import { useTrashPage } from './useTrashPage'

export function useTrashPageFacade() {
	const headerActionMotion = useAppMotionPreset('statusFeedback', 'stateAction')
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
		onViewModeChange,
		getTaskProjectLabel,
		restoreProjectItem,
		restoreTaskItem,
	} = useTrashPage()

	const projectItemMotionCache = new Map<string, number>()
	const taskItemMotionCache = new Map<string, number>()

	const viewOptions = computed(() => [
		{
			value: 'projects' as const,
			label: t('trash.tabs.projects'),
			icon: 'i-lucide-folder',
			iconClass: 'text-emerald-600',
		},
		{
			value: 'tasks' as const,
			label: t('trash.tabs.tasks'),
			icon: 'i-lucide-list-checks',
			iconClass: 'text-pink-500',
		},
	])
	const viewTabsUi = {
		root: 'w-full',
		list: 'w-full rounded-full bg-elevated/70 border border-default/80 p-1 gap-1',
		trigger:
			'rounded-full px-3.5 py-1.5 text-[11px] font-semibold hover:data-[state=inactive]:bg-default/40 hover:data-[state=inactive]:text-default hover:data-[state=inactive]:shadow-sm data-[state=active]:text-default',
		leadingIcon: 'size-3.5',
		indicator: 'rounded-full shadow-sm bg-default inset-y-1',
	}
	const viewTabItems = computed(() =>
		viewOptions.value.map((opt) => ({
			label: opt.label,
			value: opt.value,
			icon: opt.icon,
			iconClass: opt.iconClass,
		})),
	)

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
		headerActionMotion,
		loadingMotion,
		contentMotion,
		viewMode,
		loading,
		deletedProjects,
		deletedTasks,
		restoringProjectIds,
		restoringTaskIds,
		viewTabsUi,
		viewTabItems,
		onViewModeChange,
		getTaskProjectLabel,
		restoreProjectItem,
		restoreTaskItem,
		getProjectItemMotion,
		getTaskItemMotion,
	}
}
