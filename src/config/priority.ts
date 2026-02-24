import type { PriorityValue } from '@/types/shared/priority'
import { i18n } from '@/i18n'

export const PRIORITY_VALUES = ['P0', 'P1', 'P2', 'P3'] as const satisfies readonly PriorityValue[]

export type PriorityOption = {
	value: PriorityValue
	label: string
	icon: string
	iconClass: string
}

function t(key: string) {
	return i18n.global.t(key)
}

export const PRIORITY_LABELS: Record<PriorityValue, string> = {
	get P0() {
		return t('priority.P0')
	},
	get P1() {
		return t('priority.P1')
	},
	get P2() {
		return t('priority.P2')
	},
	get P3() {
		return t('priority.P3')
	},
}

export const PRIORITY_ICON_MAP: Record<PriorityValue, { icon: string; iconClass: string }> = {
	P0: { icon: 'i-lucide-alert-triangle', iconClass: 'text-red-500' },
	P1: { icon: 'i-lucide-flame', iconClass: 'text-amber-500' },
	P2: { icon: 'i-lucide-flag', iconClass: 'text-blue-500' },
	P3: { icon: 'i-lucide-leaf', iconClass: 'text-emerald-500' },
}

export const PRIORITY_OPTIONS: PriorityOption[] = PRIORITY_VALUES.map((value) => ({
	value,
	get label() {
		return PRIORITY_LABELS[value]
	},
	icon: PRIORITY_ICON_MAP[value].icon,
	iconClass: PRIORITY_ICON_MAP[value].iconClass,
}))
