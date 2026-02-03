import { LazyStore } from '@tauri-apps/plugin-store'

import type { SettingsModel, UiState } from '@/types/shared/settings'

export type ActiveSpaceId = SettingsModel['activeSpaceId']

export type { HomeView, InfoDensity, SettingsModel, UiState } from '@/types/shared/settings'

export const DEFAULT_SETTINGS: SettingsModel = {
	homeView: 'today',
	density: 'comfortable',
	autoStart: true,
	activeSpaceId: 'work',
}

export const DEFAULT_UI_STATE: UiState = {
	projectTreeExpanded: {},
	lastView: {},
	libraryCollapsed: false,
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
