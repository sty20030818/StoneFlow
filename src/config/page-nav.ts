type PageNavConfig = {
	path: string
	titleKey: string
	descriptionKey: string
	icon: string
	iconClass: string
	pillClass: string
}

export const PAGE_NAV_CONFIG = {
	allTasks: {
		path: '/all-tasks',
		titleKey: 'nav.pages.allTasks.title',
		descriptionKey: 'nav.pages.allTasks.description',
		icon: 'i-lucide-list-checks',
		iconClass: 'text-pink-500',
		pillClass: 'bg-pink-500',
	},
	finishList: {
		path: '/finish-list',
		titleKey: 'nav.pages.finishList.title',
		descriptionKey: 'nav.pages.finishList.description',
		icon: 'i-lucide-check-circle',
		iconClass: 'text-green-500',
		pillClass: 'bg-green-500',
	},
	stats: {
		path: '/stats',
		titleKey: 'nav.pages.stats.title',
		descriptionKey: 'nav.pages.stats.description',
		icon: 'i-lucide-bar-chart-3',
		iconClass: 'text-blue-500',
		pillClass: 'bg-blue-500',
	},
	logs: {
		path: '/logs',
		titleKey: 'nav.pages.logs.title',
		descriptionKey: 'nav.pages.logs.description',
		icon: 'i-lucide-scroll-text',
		iconClass: 'text-orange-500',
		pillClass: 'bg-orange-500',
	},
	snippets: {
		path: '/snippets',
		titleKey: 'nav.pages.snippets.title',
		descriptionKey: 'nav.pages.snippets.description',
		icon: 'i-lucide-code',
		iconClass: 'text-cyan-500',
		pillClass: 'bg-cyan-500',
	},
	vault: {
		path: '/vault',
		titleKey: 'nav.pages.vault.title',
		descriptionKey: 'nav.pages.vault.description',
		icon: 'i-lucide-lock',
		iconClass: 'text-yellow-500',
		pillClass: 'bg-yellow-500',
	},
	notes: {
		path: '/notes',
		titleKey: 'nav.pages.notes.title',
		descriptionKey: 'nav.pages.notes.description',
		icon: 'i-lucide-notebook',
		iconClass: 'text-pink-500',
		pillClass: 'bg-pink-500',
	},
	diary: {
		path: '/diary',
		titleKey: 'nav.pages.diary.title',
		descriptionKey: 'nav.pages.diary.description',
		icon: 'i-lucide-book-open-text',
		iconClass: 'text-indigo-500',
		pillClass: 'bg-indigo-500',
	},
	trash: {
		path: '/trash',
		titleKey: 'nav.pages.trash.title',
		descriptionKey: 'nav.pages.trash.description',
		icon: 'i-lucide-trash-2',
		iconClass: 'text-red-500',
		pillClass: 'bg-red-500',
	},
} as const satisfies Record<string, PageNavConfig>

export type PageNavKey = keyof typeof PAGE_NAV_CONFIG

type RouteMetaConfig = Pick<PageNavConfig, 'titleKey' | 'descriptionKey' | 'icon' | 'iconClass' | 'pillClass'>

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
	}
}
