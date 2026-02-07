import { watch, type Ref } from 'vue'

import type { TaskDto } from '@/services/api/tasks'
import type { useProjectsStore } from '@/stores/projects'
import { getDisplayStatus } from '@/utils/task'

import type { TaskInspectorState } from './useTaskInspectorState'

export function useTaskInspectorSync(params: {
	currentTask: Ref<TaskDto | null>
	projectsStore: ReturnType<typeof useProjectsStore>
	state: TaskInspectorState
}) {
	const { currentTask, projectsStore, state } = params

	function syncFromTask() {
		const t = currentTask.value
		if (!t) return
		state.titleLocal.value = t.title
		state.statusLocal.value = getDisplayStatus(t.status)
		state.doneReasonLocal.value = t.doneReason === 'cancelled' ? 'cancelled' : 'completed'
		state.priorityLocal.value = t.priority || 'P1'
		state.noteLocal.value = t.note || ''
		state.tagsLocal.value = t.tags || []
		state.tagInput.value = ''
		state.timelineCollapsed.value = true

		if (t.deadlineAt) {
			const d = new Date(t.deadlineAt)
			const year = d.getFullYear()
			const month = String(d.getMonth() + 1).padStart(2, '0')
			const day = String(d.getDate()).padStart(2, '0')
			state.deadlineLocal.value = `${year}-${month}-${day}`
		} else {
			state.deadlineLocal.value = ''
		}

		state.spaceIdLocal.value = t.spaceId
		state.projectIdLocal.value = t.projectId
	}

	watch(
		() => currentTask.value,
		async (task) => {
			if (task) {
				await projectsStore.load(task.spaceId)
				syncFromTask()
			}
		},
		{ immediate: true },
	)

	return { syncFromTask }
}
