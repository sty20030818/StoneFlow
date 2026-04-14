import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import {
	DEFAULT_REMOTE_SYNC_CONNECTION_TTL_MS,
	DEFAULT_REMOTE_SYNC_POLICY,
	DEFAULT_REMOTE_SYNC_SETTINGS,
	remoteSyncStore,
} from '@/infra/tauri/remote-sync-store'
import { getRemoteSyncSecret, removeRemoteSyncSecret, setRemoteSyncSecret } from '@/infra/tauri/stronghold'
import {
	buildProfileStateFromLegacy,
	cloneSettings,
	createDefaultProfileState,
	EMPTY_PROFILE_SYNC_TIME,
	hashDatabaseUrl,
	normalizeConnectionHealthMap,
	isRecord,
	normalizeName,
	normalizeProfileSyncTimes,
	normalizeSyncPolicy,
	nowIso,
	sanitizeByProfiles,
	toNonNegativeNumber,
	toPositiveNumber,
} from '@/features/settings/remote-sync/logic/remote-sync-support'
import type {
	RemoteDbProfile,
	RemoteDbProfileInput,
	RemoteSyncConnectionHealth,
	RemoteSyncConnectionHealthResult,
	RemoteSyncDirection,
	RemoteSyncExecutionSummary,
	RemoteSyncPolicy,
	RemoteSyncProfileSyncTime,
	RemoteSyncSettings,
} from '@/shared/types/shared/remote-sync'

function log(...args: unknown[]) {
	// console.log('[remote-sync-store]', ...args)
	void args
}

function logError(...args: unknown[]) {
	// console.error('[remote-sync-store]', ...args)
	void args
}

export const useRemoteSyncStore = defineStore('remote-sync', () => {
	const loaded = ref(false)
	const state = reactive<RemoteSyncSettings>(structuredClone(DEFAULT_REMOTE_SYNC_SETTINGS))

	const profiles = computed(() => state.profiles)
	const activeProfileId = computed(() => state.activeProfileId)
	const activeProfile = computed(() => state.profiles.find((p) => p.id === state.activeProfileId) ?? null)
	const hasProfiles = computed(() => state.profiles.length > 0)
	const profileStates = computed(() => state.profileStates)
	const syncPreferences = computed(() => getSyncPolicy(state.activeProfileId))
	const profileSyncTimes = computed<Record<string, RemoteSyncProfileSyncTime>>(() => {
		const result: Record<string, RemoteSyncProfileSyncTime> = {}
		for (const [profileId, profileState] of Object.entries(state.profileStates)) {
			result[profileId] = { ...profileState.syncTime }
		}
		return result
	})
	const connectionHealth = computed<Record<string, RemoteSyncConnectionHealth>>(() => {
		const result: Record<string, RemoteSyncConnectionHealth> = {}
		for (const [profileId, profileState] of Object.entries(state.profileStates)) {
			if (!profileState.connectionHealth) continue
			result[profileId] = { ...profileState.connectionHealth }
		}
		return result
	})

	function applySettings(next: RemoteSyncSettings) {
		state.profiles = next.profiles
		state.activeProfileId = next.activeProfileId
		state.profileStates = next.profileStates
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
			const stored = (await remoteSyncStore.get('remoteSync')) as Record<string, unknown> | null
			const storedProfiles = Array.isArray(stored?.profiles) ? (stored?.profiles as RemoteDbProfile[]) : []
			const legacyConnectionHealth = normalizeConnectionHealthMap(stored?.connectionHealth)
			const legacyProfileSyncTimes = normalizeProfileSyncTimes(stored?.profileSyncTimes)
			const legacySyncPolicy = normalizeSyncPolicy(stored?.syncPreferences)
			const storedProfileStates: Record<string, unknown> = isRecord(stored?.profileStates) ? stored.profileStates : {}
			const next: RemoteSyncSettings = sanitizeByProfiles({
				profiles: storedProfiles,
				activeProfileId: typeof stored?.activeProfileId === 'string' ? stored.activeProfileId : null,
				profileStates: Object.fromEntries(
					storedProfiles.map((profile) => [
						profile.id,
						buildProfileStateFromLegacy({
							profile,
							storedState: storedProfileStates[profile.id],
							legacyConnectionHealth,
							legacyProfileSyncTimes,
							legacySyncPolicy,
						}),
					]),
				),
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

	function getProfileState(profileId: string | null) {
		if (!profileId) return null
		return state.profileStates[profileId] ?? null
	}

	function getSyncPolicy(profileId: string | null) {
		const profileState = getProfileState(profileId)
		return profileState ? profileState.syncPolicy : structuredClone(DEFAULT_REMOTE_SYNC_POLICY)
	}

	function getLatestResult(profileId: string | null) {
		return getProfileState(profileId)?.latestResult ?? null
	}

	function getLatestDiagnostic(profileId: string | null) {
		return getProfileState(profileId)?.latestDiagnostic ?? null
	}

	function getConnectionHealth(profileId: string, databaseUrl?: string) {
		const entry = state.profileStates[profileId]?.connectionHealth ?? null
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
		const profileState = next.profileStates[input.profileId] ?? createDefaultProfileState(input.profileId)
		profileState.connectionHealth = {
			profileId: input.profileId,
			urlHash: hashDatabaseUrl(input.databaseUrl),
			lastTestedAt: toNonNegativeNumber(input.lastTestedAt, Date.now()),
			result: input.result,
			errorDigest: input.errorDigest ?? null,
			ttlMs: toPositiveNumber(input.ttlMs, DEFAULT_REMOTE_SYNC_CONNECTION_TTL_MS),
		}
		next.profileStates[input.profileId] = profileState
		await commitSettings(next)
	}

	async function clearConnectionHealth(profileId?: string) {
		const next = cloneSettings(state)
		if (!profileId) {
			for (const id of Object.keys(next.profileStates)) {
				next.profileStates[id].connectionHealth = null
			}
		} else if (next.profileStates[profileId]) {
			next.profileStates[profileId].connectionHealth = null
		}
		await commitSettings(next)
	}

	function getProfileSyncTime(profileId: string | null) {
		return getProfileState(profileId)?.syncTime ?? { ...EMPTY_PROFILE_SYNC_TIME }
	}

	function getLastSyncAt(profileId: string | null, direction: RemoteSyncDirection) {
		const profileSyncTime = getProfileSyncTime(profileId)
		return direction === 'push' ? profileSyncTime.lastPushedAt : profileSyncTime.lastPulledAt
	}

	async function setLastSyncAt(profileId: string, direction: RemoteSyncDirection, syncedAt: number) {
		const next = cloneSettings(state)
		const profileState = next.profileStates[profileId] ?? createDefaultProfileState(profileId)
		profileState.syncTime =
			direction === 'push'
				? {
					lastPushedAt: toNonNegativeNumber(syncedAt, 0),
					lastPulledAt: profileState.syncTime.lastPulledAt,
				}
				: {
					lastPushedAt: profileState.syncTime.lastPushedAt,
					lastPulledAt: toNonNegativeNumber(syncedAt, 0),
				}
		next.profileStates[profileId] = profileState
		await commitSettings(next)
	}

	async function updateSyncPreferences(input: Partial<RemoteSyncPolicy>, profileId = state.activeProfileId) {
		if (!profileId) return
		const next = cloneSettings(state)
		const profileState = next.profileStates[profileId] ?? createDefaultProfileState(profileId)
		profileState.syncPolicy = normalizeSyncPolicy({
			...profileState.syncPolicy,
			...input,
		})
		next.profileStates[profileId] = profileState
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
		next.profileStates[id] = createDefaultProfileState(id)
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
		if (shouldInvalidateHealth && next.profileStates[profileId]) {
			next.profileStates[profileId].connectionHealth = null
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
		delete next.profileStates[profileId]
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

	async function recordSyncExecution(summary: RemoteSyncExecutionSummary) {
		if (!summary.profileId) return
		const next = cloneSettings(state)
		const profileState = next.profileStates[summary.profileId] ?? createDefaultProfileState(summary.profileId)
		const syncedAt = Math.max(
			summary.reports.push?.syncedAt ?? 0,
			summary.reports.pull?.syncedAt ?? 0,
			Date.now(),
		)
		profileState.lastRunAt = syncedAt
		profileState.latestDiagnostic = structuredClone(summary)
		if (summary.reports.push) {
			profileState.syncTime.lastPushedAt = summary.reports.push.syncedAt
		}
		if (summary.reports.pull) {
			profileState.syncTime.lastPulledAt = summary.reports.pull.syncedAt
		}
		if (summary.status === 'success') {
			profileState.lastSuccessAt = syncedAt
			profileState.consecutiveFailures = 0
			profileState.latestResult = {
				action: summary.action,
				status: 'success',
				syncedAt,
				errorCode: null,
				errorMessage: null,
				reports: {
					push: summary.reports.push ? structuredClone(summary.reports.push) : null,
					pull: summary.reports.pull ? structuredClone(summary.reports.pull) : null,
				},
			}
		} else if (summary.status === 'failed') {
			profileState.lastFailureAt = syncedAt
			profileState.consecutiveFailures += 1
			profileState.latestResult = {
				action: summary.action,
				status: 'failed',
				syncedAt,
				errorCode: summary.errorCode ?? null,
				errorMessage: summary.errorSummary,
				reports: {
					push: summary.reports.push ? structuredClone(summary.reports.push) : null,
					pull: summary.reports.pull ? structuredClone(summary.reports.pull) : null,
				},
			}
		}
		next.profileStates[summary.profileId] = profileState
		await commitSettings(next)
	}

	return {
		loaded,
		profiles,
		activeProfileId,
		activeProfile,
		hasProfiles,
		profileStates,
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
		getProfileState,
		getSyncPolicy,
		getLatestResult,
		getLatestDiagnostic,
		getConnectionHealth,
		isConnectionHealthy,
		setConnectionHealth,
		clearConnectionHealth,
		getProfileSyncTime,
		getLastSyncAt,
		setLastSyncAt,
		updateSyncPreferences,
		recordSyncExecution,
	}
})
