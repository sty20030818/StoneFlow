import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import {
	DEFAULT_REMOTE_SYNC_CONNECTION_TTL_MS,
	DEFAULT_REMOTE_SYNC_PREFERENCES,
	DEFAULT_REMOTE_SYNC_SETTINGS,
	remoteSyncStore,
} from '@/services/tauri/remote-sync-store'
import { getRemoteSyncSecret, removeRemoteSyncSecret, setRemoteSyncSecret } from '@/services/tauri/stronghold'
import type {
	RemoteDbProfile,
	RemoteDbProfileInput,
	RemoteSyncCommandReport,
	RemoteSyncConnectionHealth,
	RemoteSyncConnectionHealthResult,
	RemoteSyncDirection,
	RemoteSyncHistoryItem,
	RemoteSyncPreferences,
	RemoteSyncProfileSyncTime,
	RemoteSyncSettings,
} from '@/types/shared/remote-sync'

const SYNC_HISTORY_LIMIT = 12

const EMPTY_PROFILE_SYNC_TIME: RemoteSyncProfileSyncTime = {
	lastPushedAt: 0,
	lastPulledAt: 0,
}

function nowIso() {
	return new Date().toISOString()
}

function normalizeName(name: string) {
	return name.trim()
}

function log(...args: unknown[]) {
	// console.log('[remote-sync-store]', ...args)
	void args
}

function logError(...args: unknown[]) {
	// console.error('[remote-sync-store]', ...args)
	void args
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toNonNegativeNumber(value: unknown, fallback: number) {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

function toPositiveNumber(value: unknown, fallback: number) {
	return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

function hashDatabaseUrl(url: string) {
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

function normalizeSyncPreferences(input: unknown): RemoteSyncPreferences {
	if (!isRecord(input)) {
		return structuredClone(DEFAULT_REMOTE_SYNC_PREFERENCES)
	}
	return {
		enabled: Boolean(input.enabled),
		intervalMinutes: toPositiveNumber(input.intervalMinutes, DEFAULT_REMOTE_SYNC_PREFERENCES.intervalMinutes),
		runOnAppStart: Boolean(input.runOnAppStart),
		runOnWindowFocus: Boolean(input.runOnWindowFocus),
		retryCount: toNonNegativeNumber(input.retryCount, DEFAULT_REMOTE_SYNC_PREFERENCES.retryCount),
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

function normalizeProfileSyncTimes(input: unknown) {
	if (!isRecord(input)) return {} as Record<string, RemoteSyncProfileSyncTime>
	const normalized: Record<string, RemoteSyncProfileSyncTime> = {}
	for (const [profileId, item] of Object.entries(input)) {
		if (!profileId) continue
		normalized[profileId] = normalizeProfileSyncTime(item)
	}
	return normalized
}

function normalizeConnectionHealthEntry(profileId: string, input: unknown): RemoteSyncConnectionHealth | null {
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

function normalizeConnectionHealthMap(input: unknown) {
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

function cloneSettings(input: RemoteSyncSettings): RemoteSyncSettings {
	return structuredClone({
		profiles: input.profiles,
		activeProfileId: input.activeProfileId,
		connectionHealth: input.connectionHealth,
		syncPreferences: input.syncPreferences,
		profileSyncTimes: input.profileSyncTimes,
		syncHistory: input.syncHistory,
	})
}

function sanitizeByProfiles(input: RemoteSyncSettings): RemoteSyncSettings {
	const next = cloneSettings(input)
	const validIds = new Set(next.profiles.map((profile) => profile.id))
	for (const profileId of Object.keys(next.connectionHealth)) {
		if (!validIds.has(profileId)) {
			delete next.connectionHealth[profileId]
		}
	}
	for (const profileId of Object.keys(next.profileSyncTimes)) {
		if (!validIds.has(profileId)) {
			delete next.profileSyncTimes[profileId]
		}
	}
	if (next.activeProfileId && !validIds.has(next.activeProfileId)) {
		next.activeProfileId = next.profiles[0]?.id ?? null
	}
	return next
}

export const useRemoteSyncStore = defineStore('remote-sync', () => {
	const loaded = ref(false)
	const state = reactive<RemoteSyncSettings>(structuredClone(DEFAULT_REMOTE_SYNC_SETTINGS))

	const profiles = computed(() => state.profiles)
	const activeProfileId = computed(() => state.activeProfileId)
	const activeProfile = computed(() => state.profiles.find((p) => p.id === state.activeProfileId) ?? null)
	const hasProfiles = computed(() => state.profiles.length > 0)
	const syncHistory = computed(() => state.syncHistory)
	const connectionHealth = computed(() => state.connectionHealth)
	const syncPreferences = computed(() => state.syncPreferences)
	const profileSyncTimes = computed(() => state.profileSyncTimes)

	function applySettings(next: RemoteSyncSettings) {
		state.profiles = next.profiles
		state.activeProfileId = next.activeProfileId
		state.connectionHealth = next.connectionHealth
		state.syncPreferences = next.syncPreferences
		state.profileSyncTimes = next.profileSyncTimes
		state.syncHistory = next.syncHistory
	}

	async function persistSettings(next: RemoteSyncSettings) {
		await remoteSyncStore.set('remoteSync', next)
		await remoteSyncStore.save()
	}

	async function commitSettings(next: RemoteSyncSettings) {
		const normalized = sanitizeByProfiles(next)
		await persistSettings(normalized)
		applySettings(normalized)
	}

	async function load() {
		log('load:start')
		try {
			const stored = await remoteSyncStore.get<RemoteSyncSettings>('remoteSync')
			const storedProfiles = stored?.profiles
			const storedSyncHistory = stored?.syncHistory
			const next: RemoteSyncSettings = sanitizeByProfiles({
				profiles: Array.isArray(storedProfiles) ? storedProfiles : [],
				activeProfileId: stored?.activeProfileId ?? null,
				connectionHealth: normalizeConnectionHealthMap(stored?.connectionHealth),
				syncPreferences: normalizeSyncPreferences(stored?.syncPreferences),
				profileSyncTimes: normalizeProfileSyncTimes(stored?.profileSyncTimes),
				syncHistory: Array.isArray(storedSyncHistory) ? storedSyncHistory : [],
			})
			applySettings(next)
			loaded.value = true
			log('load:done', {
				count: state.profiles.length,
				activeProfileId: state.activeProfileId,
			})
		} catch (error) {
			logError('load:error', error)
			throw error
		}
	}

	async function save() {
		log('save:start')
		try {
			await commitSettings(cloneSettings(state))
			log('save:done')
		} catch (error) {
			logError('save:error', error)
			throw error
		}
	}

	function getConnectionHealth(profileId: string, databaseUrl?: string) {
		const entry = state.connectionHealth[profileId]
		if (!entry) return null
		if (databaseUrl && entry.urlHash !== hashDatabaseUrl(databaseUrl)) {
			return null
		}
		return entry
	}

	function isConnectionHealthy(profileId: string, databaseUrl: string, now = Date.now()) {
		const entry = getConnectionHealth(profileId, databaseUrl)
		if (!entry || entry.result !== 'ok') return false
		return now - entry.lastTestedAt <= entry.ttlMs
	}

	async function setConnectionHealth(input: {
		profileId: string
		databaseUrl: string
		result: RemoteSyncConnectionHealthResult
		errorDigest?: string | null
		lastTestedAt?: number
		ttlMs?: number
	}) {
		const next = cloneSettings(state)
		next.connectionHealth[input.profileId] = {
			profileId: input.profileId,
			urlHash: hashDatabaseUrl(input.databaseUrl),
			lastTestedAt: toNonNegativeNumber(input.lastTestedAt, Date.now()),
			result: input.result,
			errorDigest: input.errorDigest ?? null,
			ttlMs: toPositiveNumber(input.ttlMs, DEFAULT_REMOTE_SYNC_CONNECTION_TTL_MS),
		}
		await commitSettings(next)
	}

	async function clearConnectionHealth(profileId?: string) {
		const next = cloneSettings(state)
		if (!profileId) {
			next.connectionHealth = {}
		} else {
			delete next.connectionHealth[profileId]
		}
		await commitSettings(next)
	}

	function getProfileSyncTime(profileId: string | null) {
		if (!profileId) return { ...EMPTY_PROFILE_SYNC_TIME }
		return state.profileSyncTimes[profileId] ?? { ...EMPTY_PROFILE_SYNC_TIME }
	}

	function getLastSyncAt(profileId: string | null, direction: RemoteSyncDirection) {
		const profileSyncTime = getProfileSyncTime(profileId)
		return direction === 'push' ? profileSyncTime.lastPushedAt : profileSyncTime.lastPulledAt
	}

	async function setLastSyncAt(profileId: string, direction: RemoteSyncDirection, syncedAt: number) {
		const next = cloneSettings(state)
		const current = next.profileSyncTimes[profileId] ?? { ...EMPTY_PROFILE_SYNC_TIME }
		next.profileSyncTimes[profileId] =
			direction === 'push'
				? {
						lastPushedAt: toNonNegativeNumber(syncedAt, 0),
						lastPulledAt: current.lastPulledAt,
					}
				: {
						lastPushedAt: current.lastPushedAt,
						lastPulledAt: toNonNegativeNumber(syncedAt, 0),
					}
		await commitSettings(next)
	}

	async function updateSyncPreferences(input: Partial<RemoteSyncPreferences>) {
		const next = cloneSettings(state)
		next.syncPreferences = normalizeSyncPreferences({
			...next.syncPreferences,
			...input,
		})
		await commitSettings(next)
	}

	async function addProfile(
		input: RemoteDbProfileInput,
		source: RemoteDbProfile['source'],
		options?: { activate?: boolean },
	) {
		log('addProfile:start', { name: input.name, source, activate: options?.activate ?? true })
		const id = crypto.randomUUID()
		const now = nowIso()
		const profile: RemoteDbProfile = {
			id,
			name: normalizeName(input.name),
			source,
			createdAt: now,
			updatedAt: now,
		}
		const next = cloneSettings(state)
		next.profiles.push(profile)
		next.profileSyncTimes[id] = { ...EMPTY_PROFILE_SYNC_TIME }
		if (options?.activate ?? true) {
			next.activeProfileId = id
		}
		try {
			await setRemoteSyncSecret(id, input.url.trim())
			await commitSettings(next)
			log('addProfile:done', { id })
		} catch (error) {
			await removeRemoteSyncSecret(id).catch((rollbackError) => {
				logError('addProfile:rollback-secret:error', rollbackError)
			})
			logError('addProfile:error', error)
			throw error
		}
		return profile
	}

	async function updateProfileName(profileId: string, name: string) {
		log('updateProfileName:start', { profileId })
		const next = cloneSettings(state)
		const profile = next.profiles.find((p) => p.id === profileId)
		if (!profile) return
		profile.name = normalizeName(name)
		profile.updatedAt = nowIso()
		await commitSettings(next)
		log('updateProfileName:done', { profileId })
	}

	async function updateProfileUrl(profileId: string, url: string) {
		log('updateProfileUrl:start', { profileId })
		const profile = state.profiles.find((p) => p.id === profileId)
		if (!profile) return

		let previousSecretLoaded = false
		let previousSecret: string | null = null
		try {
			previousSecret = await getRemoteSyncSecret(profileId)
			previousSecretLoaded = true
		} catch (error) {
			logError('updateProfileUrl:load-previous-secret:error', error)
		}

		const next = cloneSettings(state)
		const target = next.profiles.find((p) => p.id === profileId)
		if (!target) return
		target.updatedAt = nowIso()

		const normalizedInputUrl = url.trim()
		const normalizedPreviousUrl = previousSecret?.trim() ?? ''
		const shouldInvalidateHealth = !previousSecretLoaded || normalizedPreviousUrl !== normalizedInputUrl
		if (shouldInvalidateHealth) {
			delete next.connectionHealth[profileId]
		}

		try {
			await setRemoteSyncSecret(profileId, normalizedInputUrl)
			await commitSettings(next)
			log('updateProfileUrl:done', { profileId, healthCleared: shouldInvalidateHealth })
		} catch (error) {
			if (previousSecretLoaded) {
				const rollback = previousSecret
					? setRemoteSyncSecret(profileId, previousSecret)
					: removeRemoteSyncSecret(profileId)
				await rollback.catch((rollbackError) => {
					logError('updateProfileUrl:rollback-secret:error', rollbackError)
				})
			}
			logError('updateProfileUrl:error', error)
			throw error
		}
	}

	async function setActiveProfile(profileId: string | null) {
		log('setActiveProfile:start', { profileId })
		const next = cloneSettings(state)
		if (!profileId) {
			next.activeProfileId = null
			await commitSettings(next)
			log('setActiveProfile:cleared')
			return
		}
		if (!next.profiles.some((p) => p.id === profileId)) return
		next.activeProfileId = profileId
		await commitSettings(next)
		log('setActiveProfile:done', { profileId })
	}

	async function removeProfile(profileId: string) {
		log('removeProfile:start', { profileId })
		const exists = state.profiles.some((p) => p.id === profileId)
		if (!exists) return

		let previousSecretLoaded = false
		let previousSecret: string | null = null
		try {
			previousSecret = await getRemoteSyncSecret(profileId)
			previousSecretLoaded = true
		} catch (error) {
			logError('removeProfile:load-previous-secret:error', error)
		}

		const next = cloneSettings(state)
		next.profiles = next.profiles.filter((p) => p.id !== profileId)
		delete next.connectionHealth[profileId]
		delete next.profileSyncTimes[profileId]
		if (next.activeProfileId === profileId) {
			next.activeProfileId = next.profiles[0]?.id ?? null
		}

		try {
			await removeRemoteSyncSecret(profileId)
			await commitSettings(next)
			log('removeProfile:done', { profileId })
		} catch (error) {
			if (previousSecretLoaded && previousSecret) {
				await setRemoteSyncSecret(profileId, previousSecret).catch((rollbackError) => {
					logError('removeProfile:rollback-secret:error', rollbackError)
				})
			}
			logError('removeProfile:error', error)
			throw error
		}
	}

	async function importProfiles(items: RemoteDbProfileInput[]) {
		log('importProfiles:start', { count: items.length })
		const created: RemoteDbProfile[] = []
		for (const item of items) {
			const name = normalizeName(item.name)
			const url = item.url.trim()
			if (!name || !url) continue
			const profile = await addProfile({ name, url }, 'import', { activate: false })
			created.push(profile)
		}
		if (created.length === 0) return created
		if (!state.activeProfileId) {
			await setActiveProfile(created[0].id)
		}
		log('importProfiles:done', { created: created.length })
		return created
	}

	async function getProfileUrl(profileId: string) {
		log('getProfileUrl:start', { profileId })
		try {
			const url = await getRemoteSyncSecret(profileId)
			log('getProfileUrl:done', { profileId, hasUrl: !!url })
			return url
		} catch (error) {
			logError('getProfileUrl:error', error)
			throw error
		}
	}

	async function getActiveProfileUrl() {
		if (!state.activeProfileId) return null
		log('getActiveProfileUrl:start', { profileId: state.activeProfileId })
		try {
			const url = await getRemoteSyncSecret(state.activeProfileId)
			log('getActiveProfileUrl:done', { hasUrl: !!url })
			return url
		} catch (error) {
			logError('getActiveProfileUrl:error', error)
			throw error
		}
	}

	async function appendSyncHistory(input: {
		direction: RemoteSyncDirection
		profileId: string | null
		profileName: string
		report: RemoteSyncCommandReport
	}) {
		log('appendSyncHistory:start', { direction: input.direction, profileId: input.profileId })
		const item: RemoteSyncHistoryItem = {
			id: crypto.randomUUID(),
			profileId: input.profileId,
			profileName: normalizeName(input.profileName),
			direction: input.direction,
			syncedAt: input.report.syncedAt,
			report: input.report,
			createdAt: nowIso(),
		}
		const next = cloneSettings(state)
		next.syncHistory = [item, ...next.syncHistory].slice(0, SYNC_HISTORY_LIMIT)
		if (input.profileId) {
			const profileSyncTime = next.profileSyncTimes[input.profileId] ?? { ...EMPTY_PROFILE_SYNC_TIME }
			next.profileSyncTimes[input.profileId] =
				input.direction === 'push'
					? { lastPushedAt: input.report.syncedAt, lastPulledAt: profileSyncTime.lastPulledAt }
					: { lastPushedAt: profileSyncTime.lastPushedAt, lastPulledAt: input.report.syncedAt }
		}
		await commitSettings(next)
		log('appendSyncHistory:done', { total: state.syncHistory.length })
	}

	async function clearSyncHistory(direction?: RemoteSyncDirection) {
		log('clearSyncHistory:start', { direction: direction ?? 'all' })
		const next = cloneSettings(state)
		if (!direction) {
			next.syncHistory = []
		} else {
			next.syncHistory = next.syncHistory.filter((item) => item.direction !== direction)
		}
		await commitSettings(next)
		log('clearSyncHistory:done', { total: state.syncHistory.length })
	}

	return {
		loaded,
		profiles,
		activeProfileId,
		activeProfile,
		hasProfiles,
		syncHistory,
		connectionHealth,
		syncPreferences,
		profileSyncTimes,
		load,
		save,
		addProfile,
		updateProfileName,
		updateProfileUrl,
		setActiveProfile,
		removeProfile,
		importProfiles,
		getProfileUrl,
		getActiveProfileUrl,
		getConnectionHealth,
		isConnectionHealthy,
		setConnectionHealth,
		clearConnectionHealth,
		getProfileSyncTime,
		getLastSyncAt,
		setLastSyncAt,
		updateSyncPreferences,
		appendSyncHistory,
		clearSyncHistory,
	}
})
