import { LazyStore } from '@tauri-apps/plugin-store'

export type HomeView = 'today' | 'projects' | 'focus' | 'inbox'
export type InfoDensity = 'comfortable' | 'compact'
export type ActiveSpaceId = 'all' | 'work' | 'study' | 'personal'

export type SettingsModel = {
	homeView: HomeView
	density: InfoDensity
	autoStart: boolean
	activeSpaceId: ActiveSpaceId
}

export const DEFAULT_SETTINGS: SettingsModel = {
	homeView: 'today',
	density: 'comfortable',
	autoStart: true,
	activeSpaceId: 'all',
}

export const settingsStore = new LazyStore('settings.json', {
	defaults: {
		settings: DEFAULT_SETTINGS,
	},
	autoSave: 200,
})
