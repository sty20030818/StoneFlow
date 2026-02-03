import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { uiStore, DEFAULT_UI_STATE, type UiState } from '@/services/tauri/store'
import type { LastViewState } from '@/types/shared/settings'

export const useViewStateStore = defineStore('view-state', () => {
	const loaded = ref(false)
	const lastViews = ref<Record<string, LastViewState>>({})
	const libraryCollapsed = ref(false)

	async function load() {
		if (loaded.value) return
		const val = await uiStore.get<UiState>('ui')
		if (val?.lastView) {
			lastViews.value = { ...val.lastView }
		}
		if (typeof val?.libraryCollapsed === 'boolean') {
			libraryCollapsed.value = val.libraryCollapsed
		}
		loaded.value = true
	}

	async function setLastView(spaceId: string, view: LastViewState) {
		lastViews.value = { ...lastViews.value, [spaceId]: view }
		const current = (await uiStore.get<UiState>('ui')) ?? DEFAULT_UI_STATE
		await uiStore.set('ui', { ...current, lastView: { ...lastViews.value } })
	}

	async function setLibraryCollapsed(collapsed: boolean) {
		libraryCollapsed.value = collapsed
		const current = (await uiStore.get<UiState>('ui')) ?? DEFAULT_UI_STATE
		await uiStore.set('ui', { ...current, libraryCollapsed: collapsed })
	}

	function getLastView(spaceId: string) {
		return lastViews.value[spaceId]
	}

	return {
		loaded,
		lastViews: computed(() => lastViews.value),
		libraryCollapsed: computed(() => libraryCollapsed.value),
		load,
		setLastView,
		setLibraryCollapsed,
		getLastView,
	}
})
