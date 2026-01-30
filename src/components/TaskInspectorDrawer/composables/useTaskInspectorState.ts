import { ref } from 'vue'

import type { TaskDoneReasonValue, TaskPriorityValue, TaskStatusValue } from '@/config/task'

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
	const spaceIdLocal = ref('')
	const projectIdLocal = ref<string | null>(null)

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
		spaceIdLocal,
		projectIdLocal,
	}
}

export type TaskInspectorState = ReturnType<typeof useTaskInspectorState>
