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
		state.doneReasonLocal.value = t.done_reason === 'cancelled' ? 'cancelled' : 'completed'
		state.priorityLocal.value = t.priority || 'P1'
		state.noteLocal.value = t.note || ''
		state.tagsLocal.value = t.tags || []
		state.tagInput.value = ''
		state.timelineCollapsed.value = true

		if (t.deadline_at) {
			const d = new Date(t.deadline_at)
			const year = d.getFullYear()
			const month = String(d.getMonth() + 1).padStart(2, '0')
			const day = String(d.getDate()).padStart(2, '0')
			state.deadlineLocal.value = `${year}-${month}-${day}`
		} else {
			state.deadlineLocal.value = ''
		}

		state.spaceIdLocal.value = t.space_id
		state.projectIdLocal.value = t.project_id
	}

	watch(
		() => currentTask.value,
		async (task) => {
			if (task) {
				await projectsStore.loadForSpace(task.space_id)
				syncFromTask()
			}
		},
		{ immediate: true },
	)

	return { syncFromTask }
}
