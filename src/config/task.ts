import { PRIORITY_OPTIONS, type PriorityOption } from '@/config/priority'
import type { TaskDoneReasonValue, TaskPriorityValue, TaskStatusValue } from '@/types/domain/task'

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

export const TASK_STATUS_OPTIONS: StatusOption[] = [
	{
		value: 'todo',
		label: '待办',
		icon: 'i-lucide-list-todo',
		iconClass: 'text-blue-500',
	},
	{
		value: 'done',
		label: '已完成',
		icon: 'i-lucide-check-circle-2',
		iconClass: 'text-green-500',
	},
]

export const TASK_STATUS_LABELS: Record<TaskStatusValue, string> = {
	todo: '待办',
	done: '已完成',
}

export const TASK_STATUS_CHART_COLORS: Record<TaskStatusValue, string> = {
	todo: '#3b82f6',
	done: '#22c55e',
}

export const TASK_STATUS_SEGMENT_OPTIONS: StatusSegmentOption[] = [
	{
		value: 'todo',
		label: '待办',
		icon: 'i-lucide-list-todo',
		iconClass: 'text-blue-500',
		activeClass: 'bg-blue-50 text-blue-700 shadow-sm',
	},
	{
		value: 'done',
		label: '已完成',
		icon: 'i-lucide-check-circle',
		iconClass: 'text-emerald-500',
		activeClass: 'bg-emerald-50 text-emerald-700 shadow-sm',
	},
]

export const TASK_DONE_REASON_OPTIONS: DoneReasonOption[] = [
	{
		value: 'completed',
		label: '完成',
		icon: 'i-lucide-check-circle',
		iconClass: 'text-emerald-500',
		activeClass: 'bg-emerald-50 text-emerald-700 shadow-sm',
	},
	{
		value: 'cancelled',
		label: '取消',
		icon: 'i-lucide-x-circle',
		iconClass: 'text-red-500',
		activeClass: 'bg-red-50 text-red-700 shadow-sm',
	},
]

export const TASK_DONE_REASON_LABELS: Record<TaskDoneReasonValue, string> = {
	completed: '已完成',
	cancelled: '已取消',
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
		ringClass: 'bg-green-100 text-green-600',
		icon: 'i-lucide-check',
		badgeLabel: TASK_DONE_REASON_LABELS.completed,
	},
	cancelled: {
		ringClass: 'bg-red-100 text-red-600',
		icon: 'i-lucide-x-circle',
		badgeLabel: TASK_DONE_REASON_LABELS.cancelled,
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
		cardClass: 'bg-red-50/50 border-red-200 hover:bg-red-50/80',
		iconClass: 'text-red-500',
		textClass: 'text-red-600',
		cardBorderClass: 'hover:border-red-500/60',
		cardShadowClass: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
		badgeColor: 'red',
		badgeClass: 'bg-red-200 text-red-600',
	},
	P1: {
		cardClass: 'bg-amber-50/50 border-amber-200 hover:bg-amber-50/80',
		iconClass: 'text-amber-500',
		textClass: 'text-amber-600',
		cardBorderClass: 'hover:border-amber-500/60',
		cardShadowClass: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
		badgeColor: 'orange',
		badgeClass: 'bg-amber-200 text-amber-600',
	},
	P2: {
		cardClass: 'bg-blue-50/50 border-blue-200 hover:bg-blue-50/80',
		iconClass: 'text-blue-500',
		textClass: 'text-blue-600',
		cardBorderClass: 'hover:border-blue-500/60',
		cardShadowClass: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
		badgeColor: 'blue',
		badgeClass: 'bg-blue-200 text-blue-600',
	},
	P3: {
		cardClass: 'bg-elevated/50 border-default/60 hover:bg-elevated/80',
		iconClass: 'text-muted',
		textClass: 'text-default',
		cardBorderClass: 'hover:border-slate-300',
		cardShadowClass: '',
		badgeColor: 'gray',
		badgeClass: 'bg-slate-200 text-slate-500',
	},
	default: {
		cardClass: 'bg-elevated/50 border-default/60 hover:bg-elevated/80',
		iconClass: 'text-muted',
		textClass: 'text-default',
		cardBorderClass: 'hover:border-slate-300',
		cardShadowClass: '',
		badgeColor: 'gray',
		badgeClass: 'bg-slate-200 text-slate-500',
	},
}

export const TASK_PRIORITY_BADGE_STYLES: Record<
	TaskPriorityValue,
	{ bgClass: string; textClass: string; textOnlyClass: string }
> = {
	P0: {
		bgClass: 'bg-red-100',
		textClass: 'text-red-600',
		textOnlyClass: 'text-red-600',
	},
	P1: {
		bgClass: 'bg-amber-100',
		textClass: 'text-amber-600',
		textOnlyClass: 'text-muted',
	},
	P2: {
		bgClass: 'bg-blue-100',
		textClass: 'text-blue-600',
		textOnlyClass: 'text-blue-600',
	},
	P3: {
		bgClass: 'bg-gray-100',
		textClass: 'text-gray-600',
		textOnlyClass: 'text-muted',
	},
}

export type { TaskDoneReasonValue, TaskPriorityValue, TaskStatusValue } from '@/types/domain/task'
