import { defineStore } from 'pinia'
import { ref } from 'vue'

import { DEFAULT_UI_STATE, uiStore, type UiState } from '@/services/tauri/store'

export const useProjectTreeStore = defineStore('project-tree', () => {
	const expandedBySpace = ref<Record<string, string[]>>({})
	const loaded = ref(false)

	async function load() {
		if (loaded.value) return
		const val = await uiStore.get<UiState>('ui')
		if (val?.projectTreeExpanded) {
			expandedBySpace.value = val.projectTreeExpanded
		}
		loaded.value = true
	}

	function getExpanded(spaceId: string) {
		return expandedBySpace.value[spaceId] ?? []
	}

	async function setExpanded(spaceId: string, keys: string[]) {
		expandedBySpace.value[spaceId] = keys
		const current = (await uiStore.get<UiState>('ui')) ?? DEFAULT_UI_STATE
		await uiStore.set('ui', { ...current, projectTreeExpanded: { ...expandedBySpace.value } })
	}

	return {
		expandedBySpace,
		loaded,
		load,
		getExpanded,
		setExpanded,
	}
})
