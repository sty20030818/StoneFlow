import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import type {
	RemoteDbProfile,
	RemoteDbProfileInput,
	RemoteSyncCommandReport,
	RemoteSyncDirection,
	RemoteSyncHistoryItem,
	RemoteSyncSettings,
} from '@/types/shared/remote-sync'
import { DEFAULT_REMOTE_SYNC_SETTINGS, remoteSyncStore } from '@/services/tauri/remote-sync-store'
import { getRemoteSyncSecret, removeRemoteSyncSecret, setRemoteSyncSecret } from '@/services/tauri/stronghold'

const SYNC_HISTORY_LIMIT = 12

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

function cloneSettings(input: RemoteSyncSettings): RemoteSyncSettings {
	return structuredClone({
		profiles: input.profiles,
		activeProfileId: input.activeProfileId,
		syncHistory: input.syncHistory,
	})
}

export const useRemoteSyncStore = defineStore('remote-sync', () => {
	const loaded = ref(false)
	const state = reactive<RemoteSyncSettings>({
		...DEFAULT_REMOTE_SYNC_SETTINGS,
	})

	const profiles = computed(() => state.profiles)
	const activeProfileId = computed(() => state.activeProfileId)
	const activeProfile = computed(() => state.profiles.find((p) => p.id === state.activeProfileId) ?? null)
	const hasProfiles = computed(() => state.profiles.length > 0)
	const syncHistory = computed(() => state.syncHistory)

	function applySettings(next: RemoteSyncSettings) {
		state.profiles = next.profiles
		state.activeProfileId = next.activeProfileId
		state.syncHistory = next.syncHistory
	}

	async function persistSettings(next: RemoteSyncSettings) {
		await remoteSyncStore.set('remoteSync', next)
		await remoteSyncStore.save()
	}

	async function commitSettings(next: RemoteSyncSettings) {
		await persistSettings(next)
		applySettings(next)
	}

	async function load() {
		log('load:start')
		try {
			const stored = await remoteSyncStore.get<RemoteSyncSettings>('remoteSync')
			const storedProfiles = stored?.profiles
			const storedSyncHistory = stored?.syncHistory
			const next: RemoteSyncSettings = {
				profiles: Array.isArray(storedProfiles) ? storedProfiles : [],
				activeProfileId: stored?.activeProfileId ?? null,
				syncHistory: Array.isArray(storedSyncHistory) ? storedSyncHistory : [],
			}
			if (next.activeProfileId && !next.profiles.some((p) => p.id === next.activeProfileId)) {
				next.activeProfileId = next.profiles[0]?.id ?? null
			}
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

		try {
			await setRemoteSyncSecret(profileId, url.trim())
			await commitSettings(next)
			log('updateProfileUrl:done', { profileId })
		} catch (error) {
			if (previousSecretLoaded) {
				const rollback = previousSecret ? setRemoteSyncSecret(profileId, previousSecret) : removeRemoteSyncSecret(profileId)
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
		appendSyncHistory,
		clearSyncHistory,
	}
})
