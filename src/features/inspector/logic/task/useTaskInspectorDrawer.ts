import { useEventListener } from '@vueuse/core'
import { computed } from 'vue'

import { getWorkspaceProjectsSnapshot, useSpaceProjectsState } from '@/features/workspace'
import type { InspectorTask } from '../../model'
import { useTaskInspectorStore } from '@/features/inspector/store'

import { useTaskInspectorActions } from './useTaskInspectorActions'
import { useTaskInspectorActivityLogs } from './useTaskInspectorActivityLogs'
import { useTaskInspectorDerived } from './useTaskInspectorDerived'
import { useTaskInspectorOptions } from './useTaskInspectorOptions'
import { useTaskInspectorState } from './useTaskInspectorState'
import { useTaskInspectorSync } from './useTaskInspectorSync'

export function useTaskInspectorDrawer() {
	const store = useTaskInspectorStore()

	const currentTask = computed<InspectorTask | null>(() => store.task ?? null)

	const state = useTaskInspectorState()
	const projectsState = useSpaceProjectsState(state.spaceIdLocal, {
		enabled: computed(() => store.isOpen && Boolean(state.spaceIdLocal.value)),
	})
	const getProjectsOfSpace = (spaceId: string) => {
		if (spaceId === state.spaceIdLocal.value) {
			return projectsState.projects.value
		}
		return getWorkspaceProjectsSnapshot(spaceId)
	}
	const options = useTaskInspectorOptions({ spaceIdLocal: state.spaceIdLocal, getProjectsOfSpace })
	const actions = useTaskInspectorActions({ currentTask, state, store })
	const derived = useTaskInspectorDerived({
		currentTask,
		state,
		getProjectsOfSpace,
		saveState: actions.saveState,
	})
	const activityLogs = useTaskInspectorActivityLogs({
		currentTask,
	})

	useTaskInspectorSync({
		currentTask,
		state,
		onTaskContextChange: actions.onTaskContextChange,
	})

	const isOpen = computed({
		get: () => store.isOpen as boolean,
		set: (value) => {
			if (!value) {
				void close()
			}
		},
	})

	async function close() {
		await actions.flushPendingUpdates()
		actions.resetTextInteractionState()
		actions.clearQueueState()
		state.timelineCollapsed.value = true
		store.close()
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen.value) {
			e.preventDefault()
			void close()
		}
	}

	useEventListener(window, 'keydown', onKeydown)

	return {
		currentTask,
		isOpen,
		close,
		...state,
		...options,
		...derived,
		...actions,
		...activityLogs,
	}
}
