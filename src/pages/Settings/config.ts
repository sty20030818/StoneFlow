export type SettingsNavId = 'about' | 'remote-sync'

export type SettingsNavConfigItem = {
	id: SettingsNavId
	labelKey: string
	descriptionKey: string
	icon: string
	to: string
}

export type SettingsNavItem = {
	id: SettingsNavId
	label: string
	description: string
	icon: string
	to: string
}

export const SETTINGS_NAV_ITEMS: ReadonlyArray<SettingsNavConfigItem> = [
	{
		id: 'about',
		labelKey: 'nav.settings.about.title',
		descriptionKey: 'nav.settings.about.description',
		icon: 'i-lucide-info',
		to: '/settings/about',
	},
	{
		id: 'remote-sync',
		labelKey: 'nav.settings.remoteSync.title',
		descriptionKey: 'nav.settings.remoteSync.description',
		icon: 'i-lucide-cloud',
		to: '/settings/remote-sync',
	},
]
