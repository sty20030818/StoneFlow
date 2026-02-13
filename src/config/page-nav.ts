type PageNavConfig = {
	path: string
	title: string
	description: string
	icon: string
	iconClass: string
	pillClass: string
}

export const PAGE_NAV_CONFIG = {
	allTasks: {
		path: '/all-tasks',
		title: '所有任务',
		description: '所有任务列表',
		icon: 'i-lucide-list-checks',
		iconClass: 'text-pink-500',
		pillClass: 'bg-pink-500',
	},
	finishList: {
		path: '/finish-list',
		title: '完成列表',
		description: '已完成任务',
		icon: 'i-lucide-check-circle',
		iconClass: 'text-green-500',
		pillClass: 'bg-green-500',
	},
	stats: {
		path: '/stats',
		title: '统计',
		description: '统计数据',
		icon: 'i-lucide-bar-chart-3',
		iconClass: 'text-blue-500',
		pillClass: 'bg-blue-500',
	},
	logs: {
		path: '/logs',
		title: '日志',
		description: '操作日志',
		icon: 'i-lucide-scroll-text',
		iconClass: 'text-orange-500',
		pillClass: 'bg-orange-500',
	},
	snippets: {
		path: '/snippets',
		title: '代码片段',
		description: '代码片段',
		icon: 'i-lucide-code',
		iconClass: 'text-cyan-500',
		pillClass: 'bg-cyan-500',
	},
	vault: {
		path: '/vault',
		title: '密钥库',
		description: '安全存储',
		icon: 'i-lucide-lock',
		iconClass: 'text-yellow-500',
		pillClass: 'bg-yellow-500',
	},
	notes: {
		path: '/notes',
		title: '笔记',
		description: '笔记本',
		icon: 'i-lucide-notebook',
		iconClass: 'text-pink-500',
		pillClass: 'bg-pink-500',
	},
	diary: {
		path: '/diary',
		title: '日记',
		description: '工作日志',
		icon: 'i-lucide-book-open-text',
		iconClass: 'text-indigo-500',
		pillClass: 'bg-indigo-500',
	},
	trash: {
		path: '/trash',
		title: '回收站',
		description: '回收站',
		icon: 'i-lucide-trash-2',
		iconClass: 'text-red-500',
		pillClass: 'bg-red-500',
	},
} as const satisfies Record<string, PageNavConfig>

export type PageNavKey = keyof typeof PAGE_NAV_CONFIG

type RouteMetaConfig = Pick<PageNavConfig, 'title' | 'description' | 'icon' | 'iconClass' | 'pillClass'>

type LibraryNavItem = {
	to: string
	label: string
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
		label: item.title,
		icon: item.icon,
		iconColor: item.iconClass,
	}
})

export const SYSTEM_NAV_ITEMS: LibraryNavItem[] = SYSTEM_PAGE_KEYS.map((key) => {
	const item = PAGE_NAV_CONFIG[key]
	return {
		to: item.path,
		label: item.title,
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
		title: config.title,
		description: config.description,
		icon: config.icon,
		iconClass: config.iconClass,
		pillClass: config.pillClass,
	}
}
