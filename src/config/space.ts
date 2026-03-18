import type { SpaceId } from '@/types/domain/space'
import { tGlobal } from '@/utils/i18n'

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

function t(key: string) {
	return tGlobal(key)
}

export const SPACE_DISPLAY: Record<SpaceId, SpaceDisplay> = {
	work: {
		id: 'work',
		get label() {
			return t('spaces.work')
		},
		get description() {
			return t('spacesDescription.work')
		},
		icon: 'i-lucide-briefcase',
		iconClass: 'text-blue-500 dark:text-blue-300',
		iconMutedClass: 'text-blue-500/70 dark:text-blue-300/75',
		pillClass: 'bg-blue-500',
		cardClass: 'bg-blue-50/50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20',
		cardLabelClass: 'text-blue-400 dark:text-blue-300',
		cardValueClass: 'text-blue-600 dark:text-blue-200',
	},
	personal: {
		id: 'personal',
		get label() {
			return t('spaces.personal')
		},
		get description() {
			return t('spacesDescription.personal')
		},
		icon: 'i-lucide-user',
		iconClass: 'text-purple-500 dark:text-purple-300',
		iconMutedClass: 'text-purple-500/70 dark:text-purple-300/75',
		pillClass: 'bg-purple-500',
		cardClass: 'bg-purple-50/50 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/20',
		cardLabelClass: 'text-purple-400 dark:text-purple-300',
		cardValueClass: 'text-purple-600 dark:text-purple-200',
	},
	study: {
		id: 'study',
		get label() {
			return t('spaces.study')
		},
		get description() {
			return t('spacesDescription.study')
		},
		icon: 'i-lucide-book-open',
		iconClass: 'text-emerald-500 dark:text-emerald-300',
		iconMutedClass: 'text-emerald-500/70 dark:text-emerald-300/75',
		pillClass: 'bg-emerald-500',
		cardClass: 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20',
		cardLabelClass: 'text-emerald-400 dark:text-emerald-300',
		cardValueClass: 'text-emerald-600 dark:text-emerald-200',
	},
}

export const DEFAULT_SPACE_DISPLAY: SpaceDisplay = {
	id: 'unknown',
	get label() {
		return t('spaces.unknown')
	},
	get description() {
		return t('spacesDescription.unknown')
	},
	icon: 'i-lucide-folder',
	iconClass: 'text-gray-500 dark:text-neutral-400',
	iconMutedClass: 'text-gray-500/70 dark:text-neutral-400/75',
	pillClass: 'bg-slate-500',
	cardClass: 'bg-elevated/50 border-default/60',
	cardLabelClass: 'text-muted',
	cardValueClass: 'text-default',
}

export const SPACE_OPTIONS = SPACE_IDS.map((id) => ({
	value: id,
	get label() {
		return SPACE_DISPLAY[id].label
	},
	icon: SPACE_DISPLAY[id].icon,
	iconClass: SPACE_DISPLAY[id].iconClass,
}))

export const SPACE_LABELS: Record<SpaceId, string> = {
	get work() {
		return SPACE_DISPLAY.work.label
	},
	get personal() {
		return SPACE_DISPLAY.personal.label
	},
	get study() {
		return SPACE_DISPLAY.study.label
	},
}

export type { SpaceId } from '@/types/domain/space'
