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
		const val = await remoteSyncStore.get<RemoteSyncSettings>('remoteSync')
		if (val) {
			Object.assign(state, val)
		}
		if (state.activeProfileId && !state.profiles.some((p) => p.id === state.activeProfileId)) {
			state.activeProfileId = state.profiles[0]?.id ?? null
		}
		loaded.value = true
	}

	async function save() {
		await remoteSyncStore.set('remoteSync', { ...state })
		await remoteSyncStore.save()
	}

	async function addProfile(
		input: RemoteDbProfileInput,
		source: RemoteDbProfile['source'],
		options?: { activate?: boolean },
	) {
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
		await setRemoteSyncSecret(id, input.url.trim())
		await save()
		return profile
	}

	async function updateProfileName(profileId: string, name: string) {
		const profile = state.profiles.find((p) => p.id === profileId)
		if (!profile) return
		profile.name = normalizeName(name)
		profile.updatedAt = nowIso()
		await save()
	}

	async function updateProfileUrl(profileId: string, url: string) {
		const profile = state.profiles.find((p) => p.id === profileId)
		if (!profile) return
		await setRemoteSyncSecret(profileId, url.trim())
		profile.updatedAt = nowIso()
		await save()
	}

	async function setActiveProfile(profileId: string | null) {
		if (!profileId) {
			state.activeProfileId = null
			await save()
			return
		}
		if (!state.profiles.some((p) => p.id === profileId)) return
		state.activeProfileId = profileId
		await save()
	}

	async function removeProfile(profileId: string) {
		state.profiles = state.profiles.filter((p) => p.id !== profileId)
		if (state.activeProfileId === profileId) {
			state.activeProfileId = state.profiles[0]?.id ?? null
		}
		await removeRemoteSyncSecret(profileId)
		await save()
	}

	async function importProfiles(items: RemoteDbProfileInput[]) {
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
		return created
	}

	async function getProfileUrl(profileId: string) {
		return await getRemoteSyncSecret(profileId)
	}

	async function getActiveProfileUrl() {
		if (!state.activeProfileId) return null
		return await getRemoteSyncSecret(state.activeProfileId)
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
