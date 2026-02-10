import { LazyStore } from '@tauri-apps/plugin-store'

import type { SettingsModel, UiState } from '@/types/shared/settings'

export type ActiveSpaceId = SettingsModel['activeSpaceId']

export type {
	ExitMode,
	HomeView,
	InfoDensity,
	LibraryLastView,
	SettingsModel,
	UiState,
	WorkspaceLastView,
} from '@/types/shared/settings'

export const DEFAULT_SETTINGS: SettingsModel = {
	homeView: 'today',
	density: 'comfortable',
	autoStart: true,
	activeSpaceId: 'work',
}

export const DEFAULT_UI_STATE: UiState = {
	projectTreeExpanded: {},
	libraryCollapsed: false,
	workspaceLastViews: {
		work: null,
		personal: null,
		study: null,
	},
	workspaceLastActiveSpaceId: 'work',
	libraryLastView: null,
	lastExitMode: 'unknown',
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
