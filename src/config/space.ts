import type { SpaceId } from '@/types/domain/space'

export const SPACE_IDS = ['work', 'personal', 'study'] as const satisfies readonly SpaceId[]

export type SpaceDisplay = {
	id: SpaceId | 'unknown'
	label: string
	description: string
	icon: string
	iconClass: string
	iconMutedClass: string
	pillClass: string
	cardClass: string
	cardLabelClass: string
	cardValueClass: string
}

export const SPACE_DISPLAY: Record<SpaceId, SpaceDisplay> = {
	work: {
		id: 'work',
		label: 'Work',
		description: '工作相关任务',
		icon: 'i-lucide-briefcase',
		iconClass: 'text-blue-500',
		iconMutedClass: 'text-blue-500/70',
		pillClass: 'bg-blue-500',
		cardClass: 'bg-blue-50/50 border-blue-200',
		cardLabelClass: 'text-blue-400',
		cardValueClass: 'text-blue-600',
	},
	personal: {
		id: 'personal',
		label: 'Personal',
		description: '个人事务',
		icon: 'i-lucide-user',
		iconClass: 'text-purple-500',
		iconMutedClass: 'text-purple-500/70',
		pillClass: 'bg-purple-500',
		cardClass: 'bg-purple-50/50 border-purple-200',
		cardLabelClass: 'text-purple-400',
		cardValueClass: 'text-purple-600',
	},
	study: {
		id: 'study',
		label: 'Study',
		description: '学习相关任务',
		icon: 'i-lucide-book-open',
		iconClass: 'text-emerald-500',
		iconMutedClass: 'text-emerald-500/70',
		pillClass: 'bg-emerald-500',
		cardClass: 'bg-emerald-50/50 border-emerald-200',
		cardLabelClass: 'text-emerald-400',
		cardValueClass: 'text-emerald-600',
	},
}

export const DEFAULT_SPACE_DISPLAY: SpaceDisplay = {
	id: 'unknown',
	label: 'Unknown Space',
	description: '任务列表',
	icon: 'i-lucide-folder',
	iconClass: 'text-gray-500',
	iconMutedClass: 'text-gray-500/70',
	pillClass: 'bg-slate-500',
	cardClass: 'bg-elevated/50 border-default/60',
	cardLabelClass: 'text-muted',
	cardValueClass: 'text-default',
}

export const SPACE_OPTIONS = SPACE_IDS.map((id) => ({
	value: id,
	label: SPACE_DISPLAY[id].label,
	icon: SPACE_DISPLAY[id].icon,
	iconClass: SPACE_DISPLAY[id].iconClass,
}))

export const SPACE_LABELS: Record<SpaceId, string> = {
	work: SPACE_DISPLAY.work.label,
	personal: SPACE_DISPLAY.personal.label,
	study: SPACE_DISPLAY.study.label,
}

export type { SpaceId } from '@/types/domain/space'
