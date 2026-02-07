import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import { SPACE_IDS } from '@/config/space'
import type { SpaceId } from '@/types/domain/space'
import type { SettingsModel } from '@/services/tauri/store'
import { DEFAULT_SETTINGS, settingsStore } from '@/services/tauri/store'

export const useSettingsStore = defineStore('settings', () => {
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)
	// 优化：从 localStorage 初始化以防止闪烁
	const savedSpaceId = localStorage.getItem('settings_active_space_id')
	const initialSpaceId =
		savedSpaceId && (SPACE_IDS as readonly string[]).includes(savedSpaceId)
			? (savedSpaceId as SpaceId)
			: DEFAULT_SETTINGS.activeSpaceId

	const state = reactive<SettingsModel>({
		...DEFAULT_SETTINGS,
		activeSpaceId: initialSpaceId,
	})

	async function loadInternal() {
		const val = await settingsStore.get<SettingsModel>('settings')
		if (val) {
			const next = { ...val }
			if (!SPACE_IDS.includes(next.activeSpaceId)) {
				next.activeSpaceId = 'work'
			}
			Object.assign(state, next)
			// 同步回 localStorage
			localStorage.setItem('settings_active_space_id', next.activeSpaceId)
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

	async function save() {
		// 同步到 localStorage
		localStorage.setItem('settings_active_space_id', state.activeSpaceId)
		await settingsStore.set('settings', { ...state })
		await settingsStore.save()
	}

	async function update(patch: Partial<SettingsModel>) {
		Object.assign(state, patch)
		// 如果 activeSpaceId 改变，同步到 localStorage
		if (patch.activeSpaceId) {
			localStorage.setItem('settings_active_space_id', patch.activeSpaceId)
		}
		await settingsStore.set('settings', { ...state })
	}

	return {
		loaded,
		settings: computed(() => state),
		load,
		save,
		update,
	}
})
