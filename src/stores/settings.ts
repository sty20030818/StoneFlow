import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed, reactive, ref } from 'vue'

import { SPACE_IDS } from '@/config/space'
import type { SpaceId } from '@/types/domain/space'
import type { SettingsModel } from '@/services/tauri/store'
import { DEFAULT_SETTINGS, settingsStore } from '@/services/tauri/store'

function normalizeSpaceId(value: string | null | undefined): SpaceId {
	if (typeof value === 'string' && (SPACE_IDS as readonly string[]).includes(value)) {
		return value as SpaceId
	}
	return DEFAULT_SETTINGS.activeSpaceId
}

export const useSettingsStore = defineStore('settings', () => {
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)
	// 用 VueUse 持久化 activeSpaceId，避免手写 localStorage 样板与闪烁。
	const activeSpaceIdStorage = useStorage<SpaceId>('settings_active_space_id', DEFAULT_SETTINGS.activeSpaceId)
	const initialSpaceId = normalizeSpaceId(activeSpaceIdStorage.value)

	const state = reactive<SettingsModel>({
		...DEFAULT_SETTINGS,
		activeSpaceId: initialSpaceId,
	})

	async function loadInternal() {
		const val = await settingsStore.get<SettingsModel>('settings')
		if (val) {
			const next = {
				...val,
				activeSpaceId: normalizeSpaceId(val.activeSpaceId),
			}
			Object.assign(state, next)
			activeSpaceIdStorage.value = next.activeSpaceId
		}
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
		activeSpaceIdStorage.value = state.activeSpaceId
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
		Object.assign(state, nextPatch)
		if (patch.activeSpaceId) {
			activeSpaceIdStorage.value = normalizeSpaceId(patch.activeSpaceId)
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
