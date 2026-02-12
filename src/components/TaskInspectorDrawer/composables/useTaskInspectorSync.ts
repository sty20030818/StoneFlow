import { ref, watch, type Ref } from 'vue'

import type { TaskDto } from '@/services/api/tasks'
import type { useProjectsStore } from '@/stores/projects'
import { getDisplayStatus } from '@/utils/task'

import type { TaskInspectorState } from './useTaskInspectorState'
import {
	normalizeOptionalText,
	normalizeProjectId,
	toCustomFieldsFormItems,
	toDeadlineInputValue,
	toLinksFormItems,
} from './taskFieldNormalization'

export function useTaskInspectorSync(params: {
	currentTask: Ref<TaskDto | null>
	projectsStore: ReturnType<typeof useProjectsStore>
	state: TaskInspectorState
}) {
	const { currentTask, projectsStore, state } = params
	const syncedTaskId = ref<string | null>(null)

	function syncTaskToLocal(task: TaskDto, forceEditable: boolean) {
		state.withAutosaveSuppressed(() => {
			if (forceEditable || !state.isTextInteracting('title')) {
				state.titleLocal.value = task.title
			}
			if (forceEditable || !state.isTextInteracting('note')) {
				state.noteLocal.value = normalizeOptionalText(task.note) ?? ''
			}
			if (forceEditable || !state.isTextInteracting('links')) {
				state.linksLocal.value = toLinksFormItems(task.links)
			}
			if (forceEditable || !state.isTextInteracting('customFields')) {
				state.customFieldsLocal.value = toCustomFieldsFormItems(task.customFields)
			}

			state.statusLocal.value = getDisplayStatus(task.status)
			state.doneReasonLocal.value = task.doneReason === 'cancelled' ? 'cancelled' : 'completed'
			state.priorityLocal.value = task.priority || 'P1'
			state.tagsLocal.value = [...(task.tags ?? [])]
			state.deadlineLocal.value = toDeadlineInputValue(task.deadlineAt)
			state.spaceIdLocal.value = task.spaceId
			state.projectIdLocal.value = normalizeProjectId(task.projectId)
			state.retrySaveAvailable.value = false

			if (!forceEditable) return

			state.tagInput.value = ''
			state.linkValidationErrorIndex.value = null
			state.linkDraftTitle.value = ''
			state.linkDraftUrl.value = ''
			state.linkDraftKind.value = 'web'
			state.linkDraftVisible.value = false
			state.customFieldValidationErrorIndex.value = null
			state.customFieldDraftTitle.value = ''
			state.customFieldDraftValue.value = ''
			state.customFieldDraftVisible.value = false
		})
	}

	function syncFromTask() {
		const task = currentTask.value
		if (!task) return
		syncTaskToLocal(task, true)
	}

	watch(
		() => currentTask.value,
		async (task) => {
			if (task) {
				const switchedTask = syncedTaskId.value !== task.id
				if (switchedTask) {
					state.timelineCollapsed.value = true
					state.resetTextInteractionState()
					syncedTaskId.value = task.id
				}
				await projectsStore.load(task.spaceId)
				syncTaskToLocal(task, switchedTask)
			}
		},
		{ immediate: true },
	)

	return { syncFromTask }
}
