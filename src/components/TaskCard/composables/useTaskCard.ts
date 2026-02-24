import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

import { TASK_DONE_REASON_CARD_STYLES, type TaskDoneReasonValue } from '@/config/task'
import type { TaskDto } from '@/services/api/tasks'
import { useTaskInspectorStore } from '@/stores/taskInspector'
import { getDisplayStatus } from '@/utils/task'
import { Menu } from '@tauri-apps/api/menu'

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
	const inspectorStore = useTaskInspectorStore()
	const { t, locale } = useI18n({ useScope: 'global' })
	const displayStatus = computed(() => getDisplayStatus(props.task.status))
	const isCancelled = computed(() => props.task.doneReason === 'cancelled')
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
		emit('request-delete', props.task.id)
	}

	function onRequestEdit() {
		inspectorStore.open(props.task)
	}

	async function onContextMenu(event: MouseEvent) {
		event.preventDefault()

		try {
			const menu = await Menu.new({
				items: [
					{
						id: 'edit',
						text: t('common.actions.edit'),
						action: () => {
							onRequestEdit()
						},
					},
					{
						id: 'delete',
						text: t('common.actions.delete'),
						action: () => {
							onRequestDelete()
						},
					},
				],
			})
			await menu.popup()
		} catch (error) {
			console.error('Failed to open task context menu:', error)
		}
	}

	function onComplete() {
		emit('complete', props.task.id)
	}

	function formatRelativeTime(timestamp: number): string {
		const date = new Date(timestamp)
		const now = new Date()
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
		const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
		const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

		if (diffDays === 0) return t('taskCard.time.today')
		if (diffDays === 1) return t('taskCard.time.tomorrow')
		if (diffDays === -1) return t('taskCard.time.yesterday')
		if (diffDays > 0 && diffDays <= 7) return t('taskCard.time.inDays', { count: diffDays })
		if (diffDays < 0 && diffDays >= -7) return t('taskCard.time.daysAgo', { count: Math.abs(diffDays) })

		// 默认显示简短日期
		return date.toLocaleDateString(locale.value, {
			month: 'numeric',
			day: 'numeric',
		})
	}

	function formatAbsoluteTime(timestamp: number): string {
		const date = new Date(timestamp)
		const now = new Date()

		const pad = (n: number) => n.toString().padStart(2, '0')
		const month = pad(date.getMonth() + 1)
		const day = pad(date.getDate())
		const hour = pad(date.getHours())
		const minute = pad(date.getMinutes())
		const year = date.getFullYear()

		const isToday = date.toDateString() === now.toDateString()
		const isThisYear = year === now.getFullYear()

		if (isToday) {
			return `${hour}:${minute}`
		}

		if (isThisYear) {
			return `${month}/${day} ${hour}:${minute}`
		}

		return `${year} ${month}/${day}`
	}

	return {
		displayStatus,
		isCancelled,
		doneReasonStyle,
		selectRingClass,
		onToggleSelect,
		onCardClick,
		onRequestDelete,
		onRequestEdit,
		onContextMenu,
		onComplete,
		formatRelativeTime,
		formatAbsoluteTime,
	}
}
