import { useEventListener } from '@vueuse/core'
import { computed } from 'vue'

import type { TaskDto } from '@/services/api/tasks'
import { useProjectsStore } from '@/stores/projects'
import { useRefreshSignalsStore } from '@/stores/refresh-signals'
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
	const refreshSignals = useRefreshSignalsStore()

	const currentTask = computed<TaskDto | null>(() => store.task ?? null)

	const state = useTaskInspectorState()
	const options = useTaskInspectorOptions({ spaceIdLocal: state.spaceIdLocal, projectsStore })
	const derived = useTaskInspectorDerived({ currentTask, state, projectsStore })
	const actions = useTaskInspectorActions({ currentTask, state, store, projectsStore, refreshSignals })
	const activityLogs = useTaskInspectorActivityLogs({
		currentTask,
		taskTick: computed(() => refreshSignals.taskTick),
	})

	useTaskInspectorSync({ currentTask, projectsStore, state })

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
