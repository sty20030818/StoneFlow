import { toRaw } from 'vue'

import {
	DEFAULT_REMOTE_SYNC_CONNECTION_TTL_MS,
	DEFAULT_REMOTE_SYNC_POLICY,
} from '@/services/tauri/remote-sync-store'
import type {
	RemoteDbProfile,
	RemoteSyncCommandReport,
	RemoteSyncConnectionHealth,
	RemoteSyncConnectionHealthResult,
	RemoteSyncExecutionSummary,
	RemoteSyncLatestResult,
	RemoteSyncPolicy,
	RemoteSyncProfileState,
	RemoteSyncProfileSyncTime,
	RemoteSyncSettings,
} from '@/types/shared/remote-sync'

export const EMPTY_PROFILE_SYNC_TIME: RemoteSyncProfileSyncTime = {
	lastPushedAt: 0,
	lastPulledAt: 0,
}

export function nowIso() {
	return new Date().toISOString()
}

export function normalizeName(name: string) {
	return name.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function toNonNegativeNumber(value: unknown, fallback: number) {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

export function toPositiveNumber(value: unknown, fallback: number) {
	return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

export { isRecord }

export function hashDatabaseUrl(url: string) {
	const normalized = url.trim().toLowerCase()
	let hash = 0x811c9dc5
	for (let index = 0; index < normalized.length; index += 1) {
		hash ^= normalized.charCodeAt(index)
		hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
	}
	return `fnv1a_${(hash >>> 0).toString(16)}`
}

function normalizeConnectionHealthResult(input: unknown): RemoteSyncConnectionHealthResult {
	return input === 'error' ? 'error' : 'ok'
}

export function normalizeSyncPolicy(input: unknown): RemoteSyncPolicy {
	if (!isRecord(input)) {
		return structuredClone(DEFAULT_REMOTE_SYNC_POLICY)
	}
	return {
		enabled: Boolean(input.enabled),
		runOnInterval: input.runOnInterval === undefined ? true : Boolean(input.runOnInterval),
		intervalMinutes: toPositiveNumber(input.intervalMinutes, DEFAULT_REMOTE_SYNC_POLICY.intervalMinutes),
		runOnAppStart: Boolean(input.runOnAppStart),
		runOnWindowFocus: Boolean(input.runOnWindowFocus),
		retryCount: toNonNegativeNumber(input.retryCount, DEFAULT_REMOTE_SYNC_POLICY.retryCount),
	}
}

function normalizeProfileSyncTime(input: unknown): RemoteSyncProfileSyncTime {
	if (!isRecord(input)) {
		return { ...EMPTY_PROFILE_SYNC_TIME }
	}
	return {
		lastPushedAt: toNonNegativeNumber(input.lastPushedAt, 0),
		lastPulledAt: toNonNegativeNumber(input.lastPulledAt, 0),
	}
}

export function normalizeProfileSyncTimes(input: unknown) {
	if (!isRecord(input)) return {} as Record<string, RemoteSyncProfileSyncTime>
	const normalized: Record<string, RemoteSyncProfileSyncTime> = {}
	for (const [profileId, item] of Object.entries(input)) {
		if (!profileId) continue
		normalized[profileId] = normalizeProfileSyncTime(item)
	}
	return normalized
}

export function normalizeConnectionHealthEntry(profileId: string, input: unknown): RemoteSyncConnectionHealth | null {
	if (!isRecord(input)) return null
	if (typeof input.urlHash !== 'string' || !input.urlHash) return null
	return {
		profileId,
		urlHash: input.urlHash,
		lastTestedAt: toNonNegativeNumber(input.lastTestedAt, 0),
		result: normalizeConnectionHealthResult(input.result),
		errorDigest: typeof input.errorDigest === 'string' ? input.errorDigest : null,
		ttlMs: toPositiveNumber(input.ttlMs, DEFAULT_REMOTE_SYNC_CONNECTION_TTL_MS),
	}
}

export function normalizeConnectionHealthMap(input: unknown) {
	if (!isRecord(input)) return {} as Record<string, RemoteSyncConnectionHealth>
	const normalized: Record<string, RemoteSyncConnectionHealth> = {}
	for (const [profileId, item] of Object.entries(input)) {
		if (!profileId) continue
		const parsed = normalizeConnectionHealthEntry(profileId, item)
		if (!parsed) continue
		normalized[profileId] = parsed
	}
	return normalized
}

function normalizeLatestResult(input: unknown): RemoteSyncLatestResult | null {
	if (!isRecord(input)) return null
	const action = input.action
	const status = input.status
	if ((action !== 'push' && action !== 'pull' && action !== 'syncNow') || (status !== 'idle' && status !== 'success' && status !== 'failed')) {
		return null
	}
	const reportsSource = isRecord(input.reports) ? input.reports : {}
	return {
		action,
		status,
		syncedAt: toNonNegativeNumber(input.syncedAt, 0),
		errorCode: typeof input.errorCode === 'string' ? input.errorCode : null,
		errorMessage: typeof input.errorMessage === 'string' ? input.errorMessage : null,
		reports: {
			push: isRecord(reportsSource.push) ? (structuredClone(reportsSource.push) as RemoteSyncCommandReport) : null,
			pull: isRecord(reportsSource.pull) ? (structuredClone(reportsSource.pull) as RemoteSyncCommandReport) : null,
		},
	}
}

function normalizeExecutionSummary(input: unknown): RemoteSyncExecutionSummary | null {
	if (!isRecord(input)) return null
	const action = input.action
	const status = input.status
	if ((action !== 'push' && action !== 'pull' && action !== 'syncNow') || (status !== 'success' && status !== 'failed' && status !== 'skipped')) {
		return null
	}
	const reportsSource = isRecord(input.reports) ? input.reports : {}
	const stepsSource = Array.isArray(input.steps) ? input.steps : []
	return {
		action,
		status,
		profileId: typeof input.profileId === 'string' ? input.profileId : null,
		profileName: typeof input.profileName === 'string' ? input.profileName : '',
		usedConnectionCache: Boolean(input.usedConnectionCache),
		errorSummary: typeof input.errorSummary === 'string' ? input.errorSummary : null,
		errorCode: typeof input.errorCode === 'string' ? input.errorCode : null,
		reports: {
			push: isRecord(reportsSource.push) ? (structuredClone(reportsSource.push) as RemoteSyncCommandReport) : null,
			pull: isRecord(reportsSource.pull) ? (structuredClone(reportsSource.pull) as RemoteSyncCommandReport) : null,
		},
		steps: stepsSource
			.filter(isRecord)
			.map((step) => ({
				type: step.type === 'ensure' || step.type === 'pull' || step.type === 'push' ? step.type : 'ensure',
				status: step.status === 'success' || step.status === 'failed' || step.status === 'skipped' ? step.status : 'skipped',
				error: typeof step.error === 'string' ? step.error : null,
				errorCode: typeof step.errorCode === 'string' ? step.errorCode : null,
				report: isRecord(step.report) ? (structuredClone(step.report) as RemoteSyncCommandReport) : null,
				fromCache: typeof step.fromCache === 'boolean' ? step.fromCache : null,
			})),
	}
}

export function createDefaultProfileState(profileId: string): RemoteSyncProfileState {
	return {
		profileId,
		connectionHealth: null,
		syncPolicy: structuredClone(DEFAULT_REMOTE_SYNC_POLICY),
		syncTime: { ...EMPTY_PROFILE_SYNC_TIME },
		lastRunAt: 0,
		lastSuccessAt: 0,
		lastFailureAt: 0,
		consecutiveFailures: 0,
		latestResult: null,
		latestDiagnostic: null,
	}
}

export function cloneProfileState(input: RemoteSyncProfileState): RemoteSyncProfileState {
	return {
		profileId: input.profileId,
		connectionHealth: input.connectionHealth ? { ...toRaw(input.connectionHealth) } : null,
		syncPolicy: { ...toRaw(input.syncPolicy) },
		syncTime: { ...toRaw(input.syncTime) },
		lastRunAt: input.lastRunAt,
		lastSuccessAt: input.lastSuccessAt,
		lastFailureAt: input.lastFailureAt,
		consecutiveFailures: input.consecutiveFailures,
		latestResult: input.latestResult
			? {
				...toRaw(input.latestResult),
				reports: {
					push: input.latestResult.reports.push ? structuredClone(toRaw(input.latestResult.reports.push)) : null,
					pull: input.latestResult.reports.pull ? structuredClone(toRaw(input.latestResult.reports.pull)) : null,
				},
			}
			: null,
		latestDiagnostic: input.latestDiagnostic ? structuredClone(toRaw(input.latestDiagnostic)) : null,
	}
}

export function cloneSettings(input: RemoteSyncSettings): RemoteSyncSettings {
	const rawSettings = toRaw(input)
	const clonedProfileStates: RemoteSyncSettings['profileStates'] = {}
	for (const [profileId, item] of Object.entries(toRaw(rawSettings.profileStates))) {
		clonedProfileStates[profileId] = cloneProfileState(item)
	}

	return {
		profiles: toRaw(rawSettings.profiles).map((profile) => ({ ...toRaw(profile) })),
		activeProfileId: rawSettings.activeProfileId,
		profileStates: clonedProfileStates,
	}
}

export function sanitizeByProfiles(input: RemoteSyncSettings): RemoteSyncSettings {
	const next = cloneSettings(input)
	const validIds = new Set(next.profiles.map((profile) => profile.id))
	for (const profileId of Object.keys(next.profileStates)) {
		if (!validIds.has(profileId)) {
			delete next.profileStates[profileId]
		}
	}
	for (const profile of next.profiles) {
		next.profileStates[profile.id] = next.profileStates[profile.id]
			? cloneProfileState(next.profileStates[profile.id])
			: createDefaultProfileState(profile.id)
	}
	if (next.activeProfileId && !validIds.has(next.activeProfileId)) {
		next.activeProfileId = next.profiles[0]?.id ?? null
	}
	return next
}

export function buildProfileStateFromLegacy(options: {
	profile: RemoteDbProfile
	storedState: unknown
	legacyConnectionHealth: Record<string, RemoteSyncConnectionHealth>
	legacyProfileSyncTimes: Record<string, RemoteSyncProfileSyncTime>
	legacySyncPolicy: RemoteSyncPolicy
}): RemoteSyncProfileState {
	const { profile, storedState, legacyConnectionHealth, legacyProfileSyncTimes, legacySyncPolicy } = options
	const fallback = createDefaultProfileState(profile.id)
	const parsedState = isRecord(storedState) ? storedState : {}
	const latestResult = normalizeLatestResult(parsedState.latestResult)
	const latestDiagnostic = normalizeExecutionSummary(parsedState.latestDiagnostic)
	const syncTime = normalizeProfileSyncTime(parsedState.syncTime ?? legacyProfileSyncTimes[profile.id])
	const lastSuccessAt = toNonNegativeNumber(
		parsedState.lastSuccessAt ?? Math.max(syncTime.lastPushedAt, syncTime.lastPulledAt),
		0,
	)
	return {
		profileId: profile.id,
		connectionHealth:
			normalizeConnectionHealthEntry(profile.id, parsedState.connectionHealth) ?? legacyConnectionHealth[profile.id] ?? null,
		syncPolicy: normalizeSyncPolicy(parsedState.syncPolicy ?? legacySyncPolicy),
		syncTime,
		lastRunAt: toNonNegativeNumber(parsedState.lastRunAt ?? lastSuccessAt, 0),
		lastSuccessAt,
		lastFailureAt: toNonNegativeNumber(parsedState.lastFailureAt, 0),
		consecutiveFailures: toNonNegativeNumber(parsedState.consecutiveFailures, 0),
		latestResult: latestResult ?? fallback.latestResult,
		latestDiagnostic,
	}
}
