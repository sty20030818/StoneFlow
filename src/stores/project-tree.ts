import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { ref } from 'vue'

import { DEFAULT_UI_STATE, uiStore, type UiState } from '@/services/tauri/store'

const PROJECT_TREE_EXPANDED_CACHE_KEY = 'ui_project_tree_expanded_v1'

export const useProjectTreeStore = defineStore('project-tree', () => {
	const expandedBySpace = useStorage<Record<string, string[]>>(PROJECT_TREE_EXPANDED_CACHE_KEY, {})
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)

	async function loadInternal() {
		const val = await uiStore.get<UiState>('ui')
		if (val?.projectTreeExpanded) {
			expandedBySpace.value = val.projectTreeExpanded
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

	function getExpanded(spaceId: string) {
		return expandedBySpace.value[spaceId] ?? []
	}

	async function setExpanded(spaceId: string, keys: string[]) {
		const prev = expandedBySpace.value[spaceId] ?? []
		if (prev.length === keys.length && prev.every((k, idx) => k === keys[idx])) {
			return
		}
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
