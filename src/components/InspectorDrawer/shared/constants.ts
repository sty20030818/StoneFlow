import type { LinkDto } from '@/services/api/tasks'

export const DRAWER_CONTENT_CLASS =
	'w-[480px] max-w-[calc(100vw-1.5rem)] h-[calc(100%-1.5rem)] my-3 mr-3 flex flex-col rounded-3xl border border-default bg-default/92 backdrop-blur-2xl shadow-2xl overflow-hidden'

export const DRAWER_LINK_SELECT_MENU_UI = {
	rounded: 'rounded-lg',
	width: 'w-full',
	content: 'z-layer-drawer-popover',
}

export const DRAWER_LINK_KIND_VALUES = ['web', 'doc', 'design', 'repoLocal', 'repoRemote', 'other'] as const

export function buildDrawerLinkKindOptions(t: (key: string) => string): { value: LinkDto['kind']; label: string }[] {
	return DRAWER_LINK_KIND_VALUES.map((value) => ({
		value,
		label: t(`linkKind.${value}`),
	}))
}

export const DRAWER_LINKS_EMPTY_TEXT_KEY = 'inspector.links.empty'

export const DRAWER_LINK_KIND_FALLBACK_KEY = 'linkKind.other'
