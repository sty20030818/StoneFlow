import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'

import { uiStore, DEFAULT_UI_STATE, type UiState } from '@/services/tauri/store'
import type { LastViewState } from '@/types/shared/settings'

const LAST_VIEW_CACHE_KEY = 'ui_last_view_v1'
const LIBRARY_COLLAPSED_CACHE_KEY = 'ui_library_collapsed_v1'

export const useViewStateStore = defineStore('view-state', () => {
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)
	// 统一由 VueUse 管理本地缓存，避免手写 get/set 的重复与容错分散。
	const lastViews = useStorage<Record<string, LastViewState>>(LAST_VIEW_CACHE_KEY, {})
	const libraryCollapsed = useStorage<boolean>(LIBRARY_COLLAPSED_CACHE_KEY, false)

	async function loadInternal() {
		const val = await uiStore.get<UiState>('ui')
		if (val?.lastView) {
			lastViews.value = { ...val.lastView }
		}
		if (typeof val?.libraryCollapsed === 'boolean') {
			libraryCollapsed.value = val.libraryCollapsed
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

	async function setLastView(spaceId: string, view: LastViewState) {
		const prev = lastViews.value[spaceId]
		if (
			prev?.route === view.route
			&& prev?.spaceId === view.spaceId
			&& (prev?.projectId ?? null) === (view.projectId ?? null)
		) {
			return
		}
		lastViews.value = { ...lastViews.value, [spaceId]: view }
		const current = (await uiStore.get<UiState>('ui')) ?? DEFAULT_UI_STATE
		await uiStore.set('ui', { ...current, lastView: { ...lastViews.value } })
	}

	async function setLibraryCollapsed(collapsed: boolean) {
		if (libraryCollapsed.value === collapsed) return
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
