import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { uiStore, DEFAULT_UI_STATE, type UiState } from '@/services/tauri/store'
import type { LastViewState } from '@/types/shared/settings'

export const useViewStateStore = defineStore('view-state', () => {
	const loaded = ref(false)
	const lastView = ref<LastViewState | null>(null)

	async function load() {
		if (loaded.value) return
		const val = await uiStore.get<UiState>('ui')
		if (val?.lastView) {
			lastView.value = val.lastView
		}
		loaded.value = true
	}

	async function setLastView(next: LastViewState) {
		lastView.value = next
		const current = (await uiStore.get<UiState>('ui')) ?? DEFAULT_UI_STATE
		await uiStore.set('ui', { ...current, lastView: next })
	}

	function getLastView() {
		return lastView.value
	}

	return {
		loaded,
		lastView: computed(() => lastView.value),
		load,
		setLastView,
		getLastView,
	}
})
