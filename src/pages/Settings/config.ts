export type SettingsNavId = 'about' | 'remote-sync'

export type SettingsNavItem = {
	id: SettingsNavId
	label: string
	description: string
	icon: string
	to: string
}

export const SETTINGS_NAV_ITEMS: ReadonlyArray<SettingsNavItem> = [
	{
		id: 'about',
		label: 'About',
		description: '版本、更新、下载与链接',
		icon: 'i-lucide-info',
		to: '/settings/about',
	},
	{
		id: 'remote-sync',
		label: '远端同步',
		description: 'Neon 配置与上传下载',
		icon: 'i-lucide-cloud',
		to: '/settings/remote-sync',
	},
]
