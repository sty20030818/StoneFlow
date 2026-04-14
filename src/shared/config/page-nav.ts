import {
	HEADER_CAPSULE_TONE_BLUE,
	HEADER_CAPSULE_TONE_CYAN,
	HEADER_CAPSULE_TONE_GREEN,
	HEADER_CAPSULE_TONE_INDIGO,
	HEADER_CAPSULE_TONE_ORANGE,
	HEADER_CAPSULE_TONE_PINK,
	HEADER_CAPSULE_TONE_RED,
	HEADER_CAPSULE_TONE_YELLOW,
} from '@/shared/config/ui/capsule'

type PageNavConfig = {
	path: string
	titleKey: string
	descriptionKey: string
	icon: string
	iconClass: string
	pillClass: string
	leadingMode: HeaderLeadingMode
}

export type HeaderLeadingMode = 'page' | 'root'

export const PAGE_NAV_CONFIG = {
	allTasks: {
		path: '/all-tasks',
		titleKey: 'nav.pages.allTasks.title',
		descriptionKey: 'nav.pages.allTasks.description',
		icon: 'i-lucide-list-checks',
		iconClass: 'text-pink-500',
		pillClass: HEADER_CAPSULE_TONE_PINK,
		leadingMode: 'page',
	},
	finishList: {
		path: '/finish-list',
		titleKey: 'nav.pages.finishList.title',
		descriptionKey: 'nav.pages.finishList.description',
		icon: 'i-lucide-check-circle',
		iconClass: 'text-green-500',
		pillClass: HEADER_CAPSULE_TONE_GREEN,
		leadingMode: 'page',
	},
	stats: {
		path: '/stats',
		titleKey: 'nav.pages.stats.title',
		descriptionKey: 'nav.pages.stats.description',
		icon: 'i-lucide-bar-chart-3',
		iconClass: 'text-blue-500',
		pillClass: HEADER_CAPSULE_TONE_BLUE,
		leadingMode: 'page',
	},
	logs: {
		path: '/logs',
		titleKey: 'nav.pages.logs.title',
		descriptionKey: 'nav.pages.logs.description',
		icon: 'i-lucide-scroll-text',
		iconClass: 'text-orange-500',
		pillClass: HEADER_CAPSULE_TONE_ORANGE,
		leadingMode: 'page',
	},
	snippets: {
		path: '/snippets',
		titleKey: 'nav.pages.snippets.title',
		descriptionKey: 'nav.pages.snippets.description',
		icon: 'i-lucide-code',
		iconClass: 'text-cyan-500',
		pillClass: HEADER_CAPSULE_TONE_CYAN,
		leadingMode: 'page',
	},
	vault: {
		path: '/vault',
		titleKey: 'nav.pages.vault.title',
		descriptionKey: 'nav.pages.vault.description',
		icon: 'i-lucide-lock',
		iconClass: 'text-yellow-500',
		pillClass: HEADER_CAPSULE_TONE_YELLOW,
		leadingMode: 'page',
	},
	notes: {
		path: '/notes',
		titleKey: 'nav.pages.notes.title',
		descriptionKey: 'nav.pages.notes.description',
		icon: 'i-lucide-notebook',
		iconClass: 'text-pink-500',
		pillClass: HEADER_CAPSULE_TONE_PINK,
		leadingMode: 'page',
	},
	diary: {
		path: '/diary',
		titleKey: 'nav.pages.diary.title',
		descriptionKey: 'nav.pages.diary.description',
		icon: 'i-lucide-book-open-text',
		iconClass: 'text-indigo-500',
		pillClass: HEADER_CAPSULE_TONE_INDIGO,
		leadingMode: 'page',
	},
	trash: {
		path: '/trash',
		titleKey: 'nav.pages.trash.title',
		descriptionKey: 'nav.pages.trash.description',
		icon: 'i-lucide-trash-2',
		iconClass: 'text-red-500',
		pillClass: HEADER_CAPSULE_TONE_RED,
		leadingMode: 'page',
	},
} as const satisfies Record<string, PageNavConfig>

export type PageNavKey = keyof typeof PAGE_NAV_CONFIG

type RouteMetaConfig = Pick<
	PageNavConfig,
	'titleKey' | 'descriptionKey' | 'icon' | 'iconClass' | 'pillClass' | 'leadingMode'
>

type LibraryNavItem = {
	to: string
	labelKey: string
	icon: string
	iconColor: string
}

const LIBRARY_PAGE_KEYS = [
	'finishList',
	'stats',
	'logs',
	'snippets',
	'vault',
	'notes',
	'diary',
] as const satisfies readonly PageNavKey[]
const SYSTEM_PAGE_KEYS = ['allTasks', 'trash'] as const satisfies readonly PageNavKey[]

export const LIBRARY_NAV_ITEMS: LibraryNavItem[] = LIBRARY_PAGE_KEYS.map((key) => {
	const item = PAGE_NAV_CONFIG[key]
	return {
		to: item.path,
		labelKey: item.titleKey,
		icon: item.icon,
		iconColor: item.iconClass,
	}
})

export const SYSTEM_NAV_ITEMS: LibraryNavItem[] = SYSTEM_PAGE_KEYS.map((key) => {
	const item = PAGE_NAV_CONFIG[key]
	return {
		to: item.path,
		labelKey: item.titleKey,
		icon: item.icon,
		iconColor: item.iconClass,
	}
})

const PAGE_NAV_BY_PATH: Record<string, PageNavConfig> = Object.fromEntries(
	Object.values(PAGE_NAV_CONFIG).map((item) => [item.path, item]),
)

export function getPageNavByPath(path: string): PageNavConfig | null {
	return PAGE_NAV_BY_PATH[path] ?? null
}

export function toRouteMeta(config: PageNavConfig): RouteMetaConfig {
	return {
		titleKey: config.titleKey,
		descriptionKey: config.descriptionKey,
		icon: config.icon,
		iconClass: config.iconClass,
		pillClass: config.pillClass,
		leadingMode: config.leadingMode,
	}
}
