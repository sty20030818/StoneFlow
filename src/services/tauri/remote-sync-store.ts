import { LazyStore } from '@tauri-apps/plugin-store'

import type { RemoteSyncSettings } from '@/types/shared/remote-sync'

export const DEFAULT_REMOTE_SYNC_SETTINGS: RemoteSyncSettings = {
	profiles: [],
	activeProfileId: null,
}

export const remoteSyncStore = new LazyStore('remote-sync.json', {
	defaults: {
		remoteSync: DEFAULT_REMOTE_SYNC_SETTINGS,
	},
	autoSave: 200,
})
