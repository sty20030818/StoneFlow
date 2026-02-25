export type RemoteDbProfileSource = 'manual' | 'import'

export type RemoteDbProfile = {
	id: string
	name: string
	source: RemoteDbProfileSource
	createdAt: string
	updatedAt: string
}

export type RemoteDbProfileInput = {
	name: string
	url: string
}

export type RemoteSyncTableReport = {
	total: number
	inserted: number
	updated: number
	conflicted?: number
	skipped: number
}

export type RemoteSyncTablesReport = {
	spaces: RemoteSyncTableReport
	projects: RemoteSyncTableReport
	tags: RemoteSyncTableReport
	links: RemoteSyncTableReport
	tasks: RemoteSyncTableReport
	taskActivityLogs: RemoteSyncTableReport
	taskTags: RemoteSyncTableReport
	taskLinks: RemoteSyncTableReport
	projectTags: RemoteSyncTableReport
	projectLinks: RemoteSyncTableReport
}

export type RemoteSyncCommandReport = {
	syncedAt: number
	conflictGuardEnabled?: boolean
	tables: RemoteSyncTablesReport
}

export type RemoteSyncDirection = 'push' | 'pull'

export type RemoteSyncConnectionHealthResult = 'ok' | 'error'

export type RemoteSyncConnectionHealth = {
	profileId: string
	urlHash: string
	lastTestedAt: number
	result: RemoteSyncConnectionHealthResult
	errorDigest: string | null
	ttlMs: number
}

export type RemoteSyncPreferences = {
	enabled: boolean
	intervalMinutes: number
	runOnAppStart: boolean
	runOnWindowFocus: boolean
	retryCount: number
}

export type RemoteSyncProfileSyncTime = {
	lastPushedAt: number
	lastPulledAt: number
}

export type RemoteSyncHistoryItem = {
	id: string
	profileId: string | null
	profileName: string
	direction: RemoteSyncDirection
	syncedAt: number
	report: RemoteSyncCommandReport
	createdAt: string
}

export type RemoteSyncSettings = {
	profiles: RemoteDbProfile[]
	activeProfileId: string | null
	connectionHealth: Record<string, RemoteSyncConnectionHealth>
	syncPreferences: RemoteSyncPreferences
	profileSyncTimes: Record<string, RemoteSyncProfileSyncTime>
	syncHistory: RemoteSyncHistoryItem[]
}
