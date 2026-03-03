import type { InspectorActivityLog } from '../../../model'

export type DrawerTextInteractionHandlers = {
	onFocus: () => void
	onBlur: () => void
	onCompositionStart: () => void
	onCompositionEnd: () => void
}

export type DrawerEditInteractionHandlers = {
	onEditStart: () => void
	onEditEnd: () => void
	onCompositionStart: () => void
	onCompositionEnd: () => void
}

export type DrawerLinkFormItem = {
	id?: string
	title: string
	url: string
	kind: string
}

export type DrawerLinkKindOption = {
	value: string
	label: string
}

export type DrawerTimelineLogEntry = Pick<InspectorActivityLog, 'id' | 'action' | 'actionLabel' | 'detail' | 'createdAt'>
