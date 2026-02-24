import type { LinkDto } from '@/services/api/tasks'

const DRAWER_CONTENT_CLASS_BASE =
	'max-w-[calc(100vw-1.5rem)] h-[calc(100%-1.5rem)] my-3 mr-3 flex flex-col rounded-3xl border border-default bg-default/92 backdrop-blur-2xl shadow-2xl overflow-hidden'

export const DRAWER_CONTENT_CLASS = {
	task: `w-[480px] ${DRAWER_CONTENT_CLASS_BASE}`,
	project: `w-[480px] ${DRAWER_CONTENT_CLASS_BASE}`,
} as const

export const DRAWER_LINK_SELECT_MENU_UI = {
	rounded: 'rounded-lg',
	width: 'w-full',
	content: 'z-layer-drawer-popover',
}

export const DRAWER_LINK_KIND_OPTIONS: { value: LinkDto['kind']; label: string }[] = [
	{ value: 'web', label: '网页' },
	{ value: 'doc', label: '文档' },
	{ value: 'design', label: '设计稿' },
	{ value: 'repoLocal', label: '本地仓库' },
	{ value: 'repoRemote', label: '远程仓库' },
	{ value: 'other', label: '其他' },
]

export const DRAWER_LINKS_EMPTY_TEXT = '暂无关联链接，点击右上角“新增”创建。'
