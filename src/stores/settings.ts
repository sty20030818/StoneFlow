import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import type { SettingsModel } from '@/services/tauri/store'
import { DEFAULT_SETTINGS, settingsStore } from '@/services/tauri/store'

export const useSettingsStore = defineStore('settings', () => {
	const loaded = ref(false)
	const state = reactive<SettingsModel>({ ...DEFAULT_SETTINGS })

	async function load() {
		const val = await settingsStore.get<SettingsModel>('settings')
		if (val) {
			const next = { ...val }
			if (!['work', 'study', 'personal'].includes(next.activeSpaceId)) {
				next.activeSpaceId = 'work'
			}
			Object.assign(state, next)
		}
		loaded.value = true
	}

	async function save() {
		await settingsStore.set('settings', { ...state })
		await settingsStore.save()
	}

	async function update(patch: Partial<SettingsModel>) {
		Object.assign(state, patch)
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
