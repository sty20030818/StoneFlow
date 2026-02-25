import { LazyStore } from '@tauri-apps/plugin-store'

import type { RemoteSyncPreferences, RemoteSyncSettings } from '@/types/shared/remote-sync'

export const DEFAULT_REMOTE_SYNC_CONNECTION_TTL_MS = 5 * 60 * 1000

export const DEFAULT_REMOTE_SYNC_PREFERENCES: RemoteSyncPreferences = {
	enabled: false,
	intervalMinutes: 15,
	runOnAppStart: false,
	runOnWindowFocus: true,
	retryCount: 1,
}

export const DEFAULT_REMOTE_SYNC_SETTINGS: RemoteSyncSettings = {
	profiles: [],
	activeProfileId: null,
	connectionHealth: {},
	syncPreferences: DEFAULT_REMOTE_SYNC_PREFERENCES,
	profileSyncTimes: {},
	syncHistory: [],
}

export const remoteSyncStore = new LazyStore('remote-sync.json', {
	defaults: {
		remoteSync: DEFAULT_REMOTE_SYNC_SETTINGS,
	},
	autoSave: 200,
})
