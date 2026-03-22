import { LazyStore } from '@tauri-apps/plugin-store'

import type { RemoteSyncPolicy, RemoteSyncSettings } from '@/types/shared/remote-sync'

// 远程同步配置属于应用级持久化，继续使用 Tauri Store 独立保存。
export const DEFAULT_REMOTE_SYNC_CONNECTION_TTL_MS = 5 * 60 * 1000

export const DEFAULT_REMOTE_SYNC_POLICY: RemoteSyncPolicy = {
	enabled: false,
	intervalMinutes: 15,
	runOnAppStart: false,
	runOnWindowFocus: true,
	retryCount: 1,
}

export const DEFAULT_REMOTE_SYNC_SETTINGS: RemoteSyncSettings = {
	profiles: [],
	activeProfileId: null,
	profileStates: {},
}

export const remoteSyncStore = new LazyStore('remote-sync.json', {
	defaults: {
		remoteSync: DEFAULT_REMOTE_SYNC_SETTINGS,
	},
	autoSave: 200,
})
