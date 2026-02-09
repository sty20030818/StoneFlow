import { watch, type Ref } from 'vue'

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

	function syncFromTask() {
		const t = currentTask.value
		if (!t) return
		state.titleLocal.value = t.title
		state.statusLocal.value = getDisplayStatus(t.status)
		state.doneReasonLocal.value = t.doneReason === 'cancelled' ? 'cancelled' : 'completed'
		state.priorityLocal.value = t.priority || 'P1'
		state.noteLocal.value = normalizeOptionalText(t.note) ?? ''
		state.tagsLocal.value = [...(t.tags ?? [])]
		state.tagInput.value = ''
		state.timelineCollapsed.value = true
		state.deadlineLocal.value = toDeadlineInputValue(t.deadlineAt)
		state.retrySaveAvailable.value = false

		state.spaceIdLocal.value = t.spaceId
		state.projectIdLocal.value = normalizeProjectId(t.projectId)
		state.linksLocal.value = toLinksFormItems(t.links)
		state.linkValidationErrorIndex.value = null
		state.linkDraftTitle.value = ''
		state.linkDraftUrl.value = ''
		state.linkDraftKind.value = 'web'
		state.linkDraftVisible.value = false
		state.customFieldsLocal.value = toCustomFieldsFormItems(t.customFields)
		state.customFieldValidationErrorIndex.value = null
		state.customFieldDraftTitle.value = ''
		state.customFieldDraftValue.value = ''
		state.customFieldDraftVisible.value = false
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
