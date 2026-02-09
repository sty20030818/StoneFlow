import { ref } from 'vue'

import type { TaskDoneReasonValue, TaskPriorityValue, TaskStatusValue } from '@/config/task'
import type { TaskCustomFieldFormItem, TaskLinkFormItem } from './taskFieldNormalization'

export function useTaskInspectorState() {
	const titleLocal = ref('')
	const statusLocal = ref<TaskStatusValue>('todo')
	const doneReasonLocal = ref<TaskDoneReasonValue>('completed')
	const priorityLocal = ref<TaskPriorityValue>('P1')
	const deadlineLocal = ref('')
	const noteLocal = ref('')
	const tagsLocal = ref<string[]>([])
	const tagInput = ref('')
	const timelineCollapsed = ref(true)
	const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
	const pendingSaves = ref(0)
	const retrySaveAvailable = ref(false)
	const spaceIdLocal = ref('')
	const projectIdLocal = ref<string | null>(null)
	const linksLocal = ref<TaskLinkFormItem[]>([])
	const linkValidationErrorIndex = ref<number | null>(null)
	const linkDraftTitle = ref('')
	const linkDraftUrl = ref('')
	const linkDraftKind = ref<TaskLinkFormItem['kind']>('web')
	const linkDraftVisible = ref(false)
	const customFieldsLocal = ref<TaskCustomFieldFormItem[]>([])
	const customFieldValidationErrorIndex = ref<number | null>(null)
	const customFieldDraftTitle = ref('')
	const customFieldDraftValue = ref('')
	const customFieldDraftVisible = ref(false)

	return {
		titleLocal,
		statusLocal,
		doneReasonLocal,
		priorityLocal,
		deadlineLocal,
		noteLocal,
		tagsLocal,
		tagInput,
		timelineCollapsed,
		saveState,
		pendingSaves,
		retrySaveAvailable,
		spaceIdLocal,
		projectIdLocal,
		linksLocal,
		linkValidationErrorIndex,
		linkDraftTitle,
		linkDraftUrl,
		linkDraftKind,
		linkDraftVisible,
		customFieldsLocal,
		customFieldValidationErrorIndex,
		customFieldDraftTitle,
		customFieldDraftValue,
		customFieldDraftVisible,
	}
}

export type TaskInspectorState = ReturnType<typeof useTaskInspectorState>
