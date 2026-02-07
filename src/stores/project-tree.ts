import { defineStore } from 'pinia'
import { ref } from 'vue'

import { DEFAULT_UI_STATE, uiStore, type UiState } from '@/services/tauri/store'

const PROJECT_TREE_EXPANDED_CACHE_KEY = 'ui_project_tree_expanded_v1'

function readCachedExpandedBySpace(): Record<string, string[]> {
	try {
		const raw = localStorage.getItem(PROJECT_TREE_EXPANDED_CACHE_KEY)
		if (!raw) return {}
		const parsed = JSON.parse(raw)
		return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string[]>) : {}
	} catch {
		return {}
	}
}

function writeCachedExpandedBySpace(value: Record<string, string[]>) {
	try {
		localStorage.setItem(PROJECT_TREE_EXPANDED_CACHE_KEY, JSON.stringify(value))
	} catch {
		// ignore
	}
}

export const useProjectTreeStore = defineStore('project-tree', () => {
	const expandedBySpace = ref<Record<string, string[]>>(readCachedExpandedBySpace())
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)

	async function loadInternal() {
		const val = await uiStore.get<UiState>('ui')
		if (val?.projectTreeExpanded) {
			expandedBySpace.value = val.projectTreeExpanded
			writeCachedExpandedBySpace(expandedBySpace.value)
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
		writeCachedExpandedBySpace(expandedBySpace.value)
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
