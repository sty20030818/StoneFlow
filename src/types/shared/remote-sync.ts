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
	projectActivityLogs: RemoteSyncTableReport
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
export type RemoteSyncSummaryStatus = 'success' | 'failed' | 'skipped'
export type RemoteSyncSummaryAction = 'push' | 'pull' | 'syncNow'
export type RemoteSyncSummaryStepType = 'ensure' | 'pull' | 'push'

export type RemoteSyncStepSummary = {
	type: RemoteSyncSummaryStepType
	status: RemoteSyncSummaryStatus
	error: string | null
	errorCode?: string | null
	report: RemoteSyncCommandReport | null
	fromCache: boolean | null
}

export type RemoteSyncExecutionSummary = {
	action: RemoteSyncSummaryAction
	status: RemoteSyncSummaryStatus
	profileId: string | null
	profileName: string
	usedConnectionCache: boolean
	errorSummary: string | null
	errorCode?: string | null
	reports: {
		push: RemoteSyncCommandReport | null
		pull: RemoteSyncCommandReport | null
	}
	steps: RemoteSyncStepSummary[]
}

export type RemoteSyncConnectionHealthResult = 'ok' | 'error'

export type RemoteSyncConnectionHealth = {
	profileId: string
	urlHash: string
	lastTestedAt: number
	result: RemoteSyncConnectionHealthResult
	errorDigest: string | null
	ttlMs: number
}

export type RemoteSyncPolicy = {
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

export type RemoteSyncLatestResult = {
	action: RemoteSyncSummaryAction
	status: Exclude<RemoteSyncSummaryStatus, 'skipped'> | 'idle'
	syncedAt: number
	errorCode: string | null
	errorMessage: string | null
	reports: {
		push: RemoteSyncCommandReport | null
		pull: RemoteSyncCommandReport | null
	}
}

export type RemoteSyncProfileState = {
	profileId: string
	connectionHealth: RemoteSyncConnectionHealth | null
	syncPolicy: RemoteSyncPolicy
	syncTime: RemoteSyncProfileSyncTime
	lastRunAt: number
	lastSuccessAt: number
	lastFailureAt: number
	consecutiveFailures: number
	latestResult: RemoteSyncLatestResult | null
	latestDiagnostic: RemoteSyncExecutionSummary | null
}

export type RemoteSyncSettings = {
	profiles: RemoteDbProfile[]
	activeProfileId: string | null
	profileStates: Record<string, RemoteSyncProfileState>
}
