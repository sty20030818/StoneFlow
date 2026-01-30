export const PRIORITY_VALUES = ['P0', 'P1', 'P2', 'P3'] as const
export type PriorityValue = (typeof PRIORITY_VALUES)[number]

export type PriorityOption = {
	value: PriorityValue
	label: string
	icon: string
	iconClass: string
}

export const PRIORITY_LABELS: Record<PriorityValue, string> = {
	P0: 'P0 Critical',
	P1: 'P1 High',
	P2: 'P2 Medium',
	P3: 'P3 Low',
}

export const PRIORITY_ICON_MAP: Record<PriorityValue, { icon: string; iconClass: string }> = {
	P0: { icon: 'i-lucide-alert-triangle', iconClass: 'text-red-500' },
	P1: { icon: 'i-lucide-flame', iconClass: 'text-amber-500' },
	P2: { icon: 'i-lucide-flag', iconClass: 'text-blue-500' },
	P3: { icon: 'i-lucide-leaf', iconClass: 'text-muted' },
}

export const PRIORITY_OPTIONS: PriorityOption[] = PRIORITY_VALUES.map((value) => ({
	value,
	label: PRIORITY_LABELS[value],
	icon: PRIORITY_ICON_MAP[value].icon,
	iconClass: PRIORITY_ICON_MAP[value].iconClass,
}))
