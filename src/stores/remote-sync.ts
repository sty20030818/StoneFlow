import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import type { RemoteDbProfile, RemoteDbProfileInput, RemoteSyncSettings } from '@/types/shared/remote-sync'
import { DEFAULT_REMOTE_SYNC_SETTINGS, remoteSyncStore } from '@/services/tauri/remote-sync-store'
import {
	getRemoteSyncSecret,
	removeRemoteSyncSecret,
	setRemoteSyncSecret,
} from '@/services/tauri/stronghold'

function nowIso() {
	return new Date().toISOString()
}

function normalizeName(name: string) {
	return name.trim()
}

function log(...args: unknown[]) {
	console.log('[remote-sync-store]', ...args)
}

function logError(...args: unknown[]) {
	console.error('[remote-sync-store]', ...args)
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

	async function load() {
		log('load:start')
		try {
			const val = await remoteSyncStore.get<RemoteSyncSettings>('remoteSync')
			if (val) {
				Object.assign(state, val)
			}
			if (state.activeProfileId && !state.profiles.some((p) => p.id === state.activeProfileId)) {
				state.activeProfileId = state.profiles[0]?.id ?? null
			}
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
			await remoteSyncStore.set('remoteSync', { ...state })
			await remoteSyncStore.save()
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
		state.profiles.push(profile)
		if (options?.activate ?? true) {
			state.activeProfileId = id
		}
		try {
			await setRemoteSyncSecret(id, input.url.trim())
			await save()
			log('addProfile:done', { id })
		} catch (error) {
			logError('addProfile:error', error)
			throw error
		}
		return profile
	}

	async function updateProfileName(profileId: string, name: string) {
		log('updateProfileName:start', { profileId })
		const profile = state.profiles.find((p) => p.id === profileId)
		if (!profile) return
		profile.name = normalizeName(name)
		profile.updatedAt = nowIso()
		await save()
		log('updateProfileName:done', { profileId })
	}

	async function updateProfileUrl(profileId: string, url: string) {
		log('updateProfileUrl:start', { profileId })
		const profile = state.profiles.find((p) => p.id === profileId)
		if (!profile) return
		try {
			await setRemoteSyncSecret(profileId, url.trim())
			profile.updatedAt = nowIso()
			await save()
			log('updateProfileUrl:done', { profileId })
		} catch (error) {
			logError('updateProfileUrl:error', error)
			throw error
		}
	}

	async function setActiveProfile(profileId: string | null) {
		log('setActiveProfile:start', { profileId })
		if (!profileId) {
			state.activeProfileId = null
			await save()
			log('setActiveProfile:cleared')
			return
		}
		if (!state.profiles.some((p) => p.id === profileId)) return
		state.activeProfileId = profileId
		await save()
		log('setActiveProfile:done', { profileId })
	}

	async function removeProfile(profileId: string) {
		log('removeProfile:start', { profileId })
		state.profiles = state.profiles.filter((p) => p.id !== profileId)
		if (state.activeProfileId === profileId) {
			state.activeProfileId = state.profiles[0]?.id ?? null
		}
		try {
			await removeRemoteSyncSecret(profileId)
			await save()
			log('removeProfile:done', { profileId })
		} catch (error) {
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
			state.activeProfileId = created[0].id
			await save()
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

	return {
		loaded,
		profiles,
		activeProfileId,
		activeProfile,
		hasProfiles,
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
	}
})
