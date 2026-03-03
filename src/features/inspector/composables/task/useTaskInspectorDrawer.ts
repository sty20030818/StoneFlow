import { useEventListener } from '@vueuse/core'
import { computed } from 'vue'

import type { TaskDto } from '../../model'
import { useProjectsStore } from '@/stores/projects'
import { useTaskInspectorStore } from '@/stores/taskInspector'

import { useTaskInspectorActions } from './useTaskInspectorActions'
import { useTaskInspectorActivityLogs } from './useTaskInspectorActivityLogs'
import { useTaskInspectorDerived } from './useTaskInspectorDerived'
import { useTaskInspectorOptions } from './useTaskInspectorOptions'
import { useTaskInspectorState } from './useTaskInspectorState'
import { useTaskInspectorSync } from './useTaskInspectorSync'

export function useTaskInspectorDrawer() {
	const store = useTaskInspectorStore()
	const projectsStore = useProjectsStore()

	const currentTask = computed<TaskDto | null>(() => store.task ?? null)

	const state = useTaskInspectorState()
	const options = useTaskInspectorOptions({ spaceIdLocal: state.spaceIdLocal, projectsStore })
	const actions = useTaskInspectorActions({ currentTask, state, store, projectsStore })
	const derived = useTaskInspectorDerived({
		currentTask,
		state,
		projectsStore,
		saveState: actions.saveState,
	})
	const activityLogs = useTaskInspectorActivityLogs({
		currentTask,
	})

	useTaskInspectorSync({
		currentTask,
		projectsStore,
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
