import { LazyStore } from '@tauri-apps/plugin-store'

import type { SpaceId } from '@/config/space'

export type HomeView = 'today' | 'projects' | 'focus' | 'inbox'
export type InfoDensity = 'comfortable' | 'compact'
export type ActiveSpaceId = SpaceId

export type SettingsModel = {
	homeView: HomeView
	density: InfoDensity
	autoStart: boolean
	activeSpaceId: ActiveSpaceId
}

export type UiState = {
	projectTreeExpanded: Record<string, string[]>
}

export const DEFAULT_SETTINGS: SettingsModel = {
	homeView: 'today',
	density: 'comfortable',
	autoStart: true,
	activeSpaceId: 'work',
}

export const DEFAULT_UI_STATE: UiState = {
	projectTreeExpanded: {},
}

export const settingsStore = new LazyStore('settings.json', {
	defaults: {
		settings: DEFAULT_SETTINGS,
	},
	autoSave: 200,
})

export const uiStore = new LazyStore('ui.json', {
	defaults: {
		ui: DEFAULT_UI_STATE,
	},
	autoSave: 200,
})
