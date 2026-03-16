const LEGACY_STORAGE_KEYS = [
	'trash_snapshot_v1',
	'space_tasks_snapshot_v1',
	'project_tasks_snapshot_v1',
] as const

let cleanedUpLegacyStorage = false

export function cleanupLegacyStorageKeys() {
	if (cleanedUpLegacyStorage) return
	if (typeof window === 'undefined') return

	for (const storageKey of LEGACY_STORAGE_KEYS) {
		window.localStorage.removeItem(storageKey)
	}

	cleanedUpLegacyStorage = true
}
