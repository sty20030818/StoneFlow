import { computed } from 'vue'

import { TASK_DONE_REASON_CARD_STYLES, type TaskDoneReasonValue } from '@/config/task'
import type { TaskDto } from '@/services/api/tasks'
import { getDisplayStatus } from '@/utils/task'

export type TaskCardProps = {
	task: TaskDto
	showCompleteButton?: boolean
	showTime?: boolean
	showSpaceLabel?: boolean
	isEditMode?: boolean
	selected?: boolean
}

export type TaskCardEmits = {
	(e: 'click', task: TaskDto): void
	(e: 'complete', taskId: string): void
	(e: 'toggle-select', taskId: string): void
	(e: 'request-delete', taskId: string): void
}

export function useTaskCard(props: TaskCardProps, emit: TaskCardEmits) {
	const displayStatus = computed(() => getDisplayStatus(props.task.status))
	const isCancelled = computed(() => props.task.done_reason === 'cancelled')
	const doneReasonKey = computed<TaskDoneReasonValue>(() => (isCancelled.value ? 'cancelled' : 'completed'))
	const doneReasonStyle = computed(() => TASK_DONE_REASON_CARD_STYLES[doneReasonKey.value])

	const selectRingClass = computed(() => {
		if (props.selected) return 'border-error/70 bg-error/15 text-error shadow-sm'
		return 'border-default/60 bg-default hover:border-default text-transparent'
	})

	function onToggleSelect() {
		emit('toggle-select', props.task.id)
	}

	function onCardClick() {
		if (props.isEditMode) {
			onToggleSelect()
			return
		}
		emit('click', props.task)
	}

	function onRequestDelete() {
		if (!props.isEditMode) return
		emit('request-delete', props.task.id)
	}

	function onComplete() {
		emit('complete', props.task.id)
	}

	function formatDueDate(timestamp: number): string {
		const date = new Date(timestamp)
		const now = new Date()
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
		const dueDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
		const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

		if (diffDays === 0) return '今天'
		if (diffDays === 1) return '明天'
		if (diffDays === -1) return '昨天'
		if (diffDays > 0 && diffDays <= 7) return `${diffDays}天后`
		if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}天前`

		return date.toLocaleDateString('zh-CN', {
			month: 'short',
			day: 'numeric',
		})
	}

	return {
		displayStatus,
		isCancelled,
		doneReasonStyle,
		selectRingClass,
		onToggleSelect,
		onCardClick,
		onRequestDelete,
		onComplete,
		formatDueDate,
	}
}
