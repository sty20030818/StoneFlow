import { LazyStore } from '@tauri-apps/plugin-store'

import type { SettingsModel } from '@/types/shared/settings'

export type ActiveSpaceId = SettingsModel['activeSpaceId']

export type {
	ExitMode,
	HomeView,
	InfoDensity,
	LibraryLastView,
	SettingsModel,
	WorkspaceLastView,
} from '@/types/shared/settings'

// 这里只保存应用级配置；前端轻量 UI 状态统一走 Pinia + localStorage。
export const DEFAULT_SETTINGS: SettingsModel = {
	homeView: 'today',
	density: 'comfortable',
	autoStart: true,
	activeSpaceId: 'work',
	locale: null,
	updaterAutoCheck: true,
	updaterPromptInstall: true,
}

export const settingsStore = new LazyStore('settings.json', {
	defaults: {
		settings: DEFAULT_SETTINGS,
	},
	autoSave: 200,
})
