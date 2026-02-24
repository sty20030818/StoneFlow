import { reactive, ref } from 'vue'

import type { TaskDoneReasonValue, TaskPriorityValue, TaskStatusValue } from '@/config/task'
import type { TaskCustomFieldFormItem, TaskLinkFormItem } from './taskFieldNormalization'

export type TextInteractionField = 'title' | 'note' | 'links' | 'customFields'

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
	const textInteraction = reactive<Record<TextInteractionField, { editing: boolean; composing: boolean }>>({
		title: { editing: false, composing: false },
		note: { editing: false, composing: false },
		links: { editing: false, composing: false },
		customFields: { editing: false, composing: false },
	})
	const suppressAutosave = ref(false)

	function markTextEditing(field: TextInteractionField) {
		textInteraction[field].editing = true
	}

	function markTextEditEnd(field: TextInteractionField) {
		textInteraction[field].editing = false
		textInteraction[field].composing = false
	}

	function markTextComposing(field: TextInteractionField) {
		textInteraction[field].editing = true
		textInteraction[field].composing = true
	}

	function markTextCompositionEnd(field: TextInteractionField) {
		textInteraction[field].composing = false
	}

	function isTextInteracting(field: TextInteractionField): boolean {
		return textInteraction[field].editing || textInteraction[field].composing
	}

	function withAutosaveSuppressed<T>(fn: () => T): T {
		suppressAutosave.value = true
		try {
			return fn()
		} finally {
			suppressAutosave.value = false
		}
	}

	function resetTextInteractionState() {
		for (const field of Object.keys(textInteraction) as TextInteractionField[]) {
			textInteraction[field].editing = false
			textInteraction[field].composing = false
		}
	}

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
		textInteraction,
		suppressAutosave,
		markTextEditing,
		markTextEditEnd,
		markTextComposing,
		markTextCompositionEnd,
		isTextInteracting,
		withAutosaveSuppressed,
		resetTextInteractionState,
	}
}

export type TaskInspectorState = ReturnType<typeof useTaskInspectorState>
