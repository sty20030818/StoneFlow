import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import { normalizeThemePreference } from '@/shared/config/theme'
import { SPACE_IDS } from '@/shared/config/space'
import { normalizeAppLocale } from '@/i18n/messages'
import { readUiNavigationStateSnapshot, writeUiNavigationActiveSpaceId } from '@/app/stores/ui-navigation-storage'
import type { SpaceId } from '@/shared/types/domain/space'
import type { SettingsModel } from '@/infra/tauri/store'
import { DEFAULT_SETTINGS, settingsStore } from '@/infra/tauri/store'

function normalizeSpaceId(value: string | null | undefined): SpaceId {
	if (typeof value === 'string' && (SPACE_IDS as readonly string[]).includes(value)) {
		return value as SpaceId
	}
	return DEFAULT_SETTINGS.activeSpaceId
}

export const useSettingsStore = defineStore('settings', () => {
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)
	const initialSpaceId = normalizeSpaceId(readUiNavigationStateSnapshot().activeSpaceId)

	const state = reactive<SettingsModel>({
		...DEFAULT_SETTINGS,
		activeSpaceId: initialSpaceId,
	})

	async function loadInternal() {
		const val = await settingsStore.get<SettingsModel>('settings')
		const stored = val ?? DEFAULT_SETTINGS
		const next = {
			...DEFAULT_SETTINGS,
			...stored,
			activeSpaceId: normalizeSpaceId(stored.activeSpaceId),
			locale: normalizeAppLocale(stored.locale),
			themePreference: normalizeThemePreference(stored.themePreference),
		}
		Object.assign(state, next)
		writeUiNavigationActiveSpaceId(next.activeSpaceId)
		loaded.value = true
	}

	async function load(options: { force?: boolean } = {}) {
		const { force = false } = options
		if (force) {
			loaded.value = false
		}
		if (loaded.value) return
		if (loadingPromise.value) {
			return await loadingPromise.value
		}
		loadingPromise.value = (async () => {
			try {
				await loadInternal()
			} finally {
				loadingPromise.value = null
			}
		})()
		return await loadingPromise.value
	}

	async function flush() {
		writeUiNavigationActiveSpaceId(state.activeSpaceId)
		await settingsStore.set('settings', { ...state })
		await settingsStore.save()
	}

	async function save() {
		await flush()
	}

	async function update(patch: Partial<SettingsModel>) {
		const nextPatch = { ...patch }
		if (patch.activeSpaceId !== undefined) {
			nextPatch.activeSpaceId = normalizeSpaceId(patch.activeSpaceId)
		}
		if (patch.locale !== undefined) {
			nextPatch.locale = normalizeAppLocale(patch.locale)
		}
		if (patch.themePreference !== undefined) {
			nextPatch.themePreference = normalizeThemePreference(patch.themePreference)
		}
		Object.assign(state, nextPatch)
		if (patch.activeSpaceId !== undefined) {
			writeUiNavigationActiveSpaceId(normalizeSpaceId(patch.activeSpaceId))
		}
		await settingsStore.set('settings', { ...state })
	}

	return {
		loaded,
		settings: computed(() => state),
		load,
		save,
		flush,
		update,
	}
})
