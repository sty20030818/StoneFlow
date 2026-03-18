import { PRIORITY_OPTIONS, type PriorityOption } from '@/config/priority'
import type { TaskDoneReasonValue, TaskPriorityValue, TaskStatusValue } from '@/types/domain/task'
import { tGlobal } from '@/utils/i18n'

export type StatusOption = {
	value: TaskStatusValue
	label: string
	icon: string
	iconClass: string
}

export type StatusSegmentOption = StatusOption & {
	activeClass: string
}

export type DoneReasonOption = {
	value: TaskDoneReasonValue
	label: string
	icon: string
	iconClass: string
	activeClass: string
}

export type { PriorityOption }

function t(key: string) {
	return tGlobal(key)
}

export const TASK_STATUS_OPTIONS: StatusOption[] = [
	{
		value: 'todo',
		get label() {
			return t('task.status.todo')
		},
		icon: 'i-lucide-list-todo',
		iconClass: 'text-blue-500 dark:text-blue-300',
	},
	{
		value: 'done',
		get label() {
			return t('task.status.done')
		},
		icon: 'i-lucide-check-circle-2',
		iconClass: 'text-green-500 dark:text-green-300',
	},
]

export const TASK_STATUS_LABELS: Record<TaskStatusValue, string> = {
	get todo() {
		return t('task.status.todo')
	},
	get done() {
		return t('task.status.done')
	},
}

export const TASK_STATUS_CHART_COLORS: Record<TaskStatusValue, string> = {
	todo: '#3b82f6',
	done: '#22c55e',
}

export const TASK_STATUS_SEGMENT_OPTIONS: StatusSegmentOption[] = [
	{
		value: 'todo',
		get label() {
			return t('task.status.todo')
		},
		icon: 'i-lucide-list-todo',
		iconClass: 'text-blue-500 dark:text-blue-300',
		activeClass: 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-500/15 dark:text-blue-200',
	},
	{
		value: 'done',
		get label() {
			return t('task.status.done')
		},
		icon: 'i-lucide-check-circle',
		iconClass: 'text-emerald-500 dark:text-emerald-300',
		activeClass: 'bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-200',
	},
]

export const TASK_DONE_REASON_OPTIONS: DoneReasonOption[] = [
	{
		value: 'completed',
		get label() {
			return t('task.doneReason.completed')
		},
		icon: 'i-lucide-check-circle',
		iconClass: 'text-emerald-500 dark:text-emerald-300',
		activeClass: 'bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-200',
	},
	{
		value: 'cancelled',
		get label() {
			return t('task.doneReason.cancelled')
		},
		icon: 'i-lucide-x-circle',
		iconClass: 'text-red-500 dark:text-red-300',
		activeClass: 'bg-red-50 text-red-700 shadow-sm dark:bg-red-500/15 dark:text-red-200',
	},
]

export const TASK_DONE_REASON_LABELS: Record<TaskDoneReasonValue, string> = {
	get completed() {
		return t('task.doneReason.completed')
	},
	get cancelled() {
		return t('task.doneReason.cancelled')
	},
}

export const TASK_DONE_REASON_COLORS: Record<TaskDoneReasonValue, string> = {
	completed: '#22c55e',
	cancelled: '#ef4444',
}

export const TASK_DONE_REASON_CARD_STYLES: Record<
	TaskDoneReasonValue,
	{ ringClass: string; icon: string; badgeLabel: string }
> = {
	completed: {
		ringClass: 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-200',
		icon: 'i-lucide-check',
		get badgeLabel() {
			return TASK_DONE_REASON_LABELS.completed
		},
	},
	cancelled: {
		ringClass: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-200',
		icon: 'i-lucide-x-circle',
		get badgeLabel() {
			return TASK_DONE_REASON_LABELS.cancelled
		},
	},
}

export const TASK_PRIORITY_OPTIONS: PriorityOption[] = PRIORITY_OPTIONS

export const TASK_PRIORITY_STYLES: Record<
	TaskPriorityValue | 'default',
	{
		cardClass: string
		iconClass: string
		textClass: string
		cardBorderClass: string
		cardShadowClass: string
		badgeColor: string
		badgeClass: string // 增加显式类名用于兜底显色
	}
> = {
	P0: {
		cardClass:
			'bg-red-50/50 border-red-200 hover:bg-red-50/80 dark:bg-red-500/10 dark:border-red-500/20 dark:hover:bg-red-500/16',
		iconClass: 'text-red-500 dark:text-red-300',
		textClass: 'text-red-600 dark:text-red-200',
		cardBorderClass: 'hover:border-red-500/60 dark:hover:border-red-400/55',
		cardShadowClass: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] dark:hover:shadow-[0_0_24px_rgba(248,113,113,0.18)]',
		badgeColor: 'red',
		badgeClass: 'bg-red-200 text-red-600 dark:bg-red-500/15 dark:text-red-200',
	},
	P1: {
		cardClass:
			'bg-amber-50/50 border-amber-200 hover:bg-amber-50/80 dark:bg-amber-500/10 dark:border-amber-500/20 dark:hover:bg-amber-500/16',
		iconClass: 'text-amber-500 dark:text-amber-300',
		textClass: 'text-amber-600 dark:text-amber-200',
		cardBorderClass: 'hover:border-amber-500/60 dark:hover:border-amber-400/55',
		cardShadowClass: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] dark:hover:shadow-[0_0_24px_rgba(251,191,36,0.18)]',
		badgeColor: 'orange',
		badgeClass: 'bg-amber-200 text-amber-600 dark:bg-amber-500/15 dark:text-amber-200',
	},
	P2: {
		cardClass:
			'bg-blue-50/50 border-blue-200 hover:bg-blue-50/80 dark:bg-blue-500/10 dark:border-blue-500/20 dark:hover:bg-blue-500/16',
		iconClass: 'text-blue-500 dark:text-blue-300',
		textClass: 'text-blue-600 dark:text-blue-200',
		cardBorderClass: 'hover:border-blue-500/60 dark:hover:border-blue-400/55',
		cardShadowClass: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] dark:hover:shadow-[0_0_24px_rgba(96,165,250,0.2)]',
		badgeColor: 'blue',
		badgeClass: 'bg-blue-200 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200',
	},
	P3: {
		cardClass:
			'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50/80 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:hover:bg-emerald-500/16',
		iconClass: 'text-emerald-500 dark:text-emerald-300',
		textClass: 'text-emerald-600 dark:text-emerald-200',
		cardBorderClass: 'hover:border-emerald-500/60 dark:hover:border-emerald-400/55',
		cardShadowClass: '',
		badgeColor: 'green',
		badgeClass: 'bg-emerald-200 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-200',
	},
	default: {
		cardClass: 'bg-elevated/50 border-default/60 hover:bg-elevated/80',
		iconClass: 'text-muted',
		textClass: 'text-default',
		cardBorderClass: 'hover:border-slate-300 dark:hover:border-neutral-700',
		cardShadowClass: '',
		badgeColor: 'gray',
		badgeClass: 'bg-slate-200 text-slate-500 dark:bg-neutral-700/70 dark:text-neutral-200',
	},
}

export const TASK_PRIORITY_BADGE_STYLES: Record<
	TaskPriorityValue,
	{ bgClass: string; textClass: string; textOnlyClass: string }
> = {
	P0: {
		bgClass: 'bg-red-100 dark:bg-red-500/15',
		textClass: 'text-red-600 dark:text-red-200',
		textOnlyClass: 'text-red-600 dark:text-red-200',
	},
	P1: {
		bgClass: 'bg-amber-100 dark:bg-amber-500/15',
		textClass: 'text-amber-600 dark:text-amber-200',
		textOnlyClass: 'text-amber-600 dark:text-amber-200',
	},
	P2: {
		bgClass: 'bg-blue-100 dark:bg-blue-500/15',
		textClass: 'text-blue-600 dark:text-blue-200',
		textOnlyClass: 'text-blue-600 dark:text-blue-200',
	},
	P3: {
		bgClass: 'bg-emerald-100 dark:bg-emerald-500/15',
		textClass: 'text-emerald-600 dark:text-emerald-200',
		textOnlyClass: 'text-emerald-600 dark:text-emerald-200',
	},
}

export type { TaskDoneReasonValue, TaskPriorityValue, TaskStatusValue } from '@/types/domain/task'
