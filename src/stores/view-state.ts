import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { uiStore, DEFAULT_UI_STATE, type UiState } from '@/services/tauri/store'
import type { LastViewState } from '@/types/shared/settings'

const LAST_VIEW_CACHE_KEY = 'ui_last_view_v1'
const LIBRARY_COLLAPSED_CACHE_KEY = 'ui_library_collapsed_v1'

function readCachedLastViews(): Record<string, LastViewState> {
	try {
		const raw = localStorage.getItem(LAST_VIEW_CACHE_KEY)
		if (!raw) return {}
		const parsed = JSON.parse(raw)
		return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, LastViewState>) : {}
	} catch {
		return {}
	}
}

function readCachedLibraryCollapsed(): boolean {
	try {
		return localStorage.getItem(LIBRARY_COLLAPSED_CACHE_KEY) === '1'
	} catch {
		return false
	}
}

function writeCachedLastViews(value: Record<string, LastViewState>) {
	try {
		localStorage.setItem(LAST_VIEW_CACHE_KEY, JSON.stringify(value))
	} catch {
		// ignore
	}
}

function writeCachedLibraryCollapsed(value: boolean) {
	try {
		localStorage.setItem(LIBRARY_COLLAPSED_CACHE_KEY, value ? '1' : '0')
	} catch {
		// ignore
	}
}

export const useViewStateStore = defineStore('view-state', () => {
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)
	const lastViews = ref<Record<string, LastViewState>>(readCachedLastViews())
	const libraryCollapsed = ref(readCachedLibraryCollapsed())

	async function loadInternal() {
		const val = await uiStore.get<UiState>('ui')
		if (val?.lastView) {
			lastViews.value = { ...val.lastView }
			writeCachedLastViews(lastViews.value)
		}
		if (typeof val?.libraryCollapsed === 'boolean') {
			libraryCollapsed.value = val.libraryCollapsed
			writeCachedLibraryCollapsed(libraryCollapsed.value)
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
		writeCachedLastViews(lastViews.value)
		const current = (await uiStore.get<UiState>('ui')) ?? DEFAULT_UI_STATE
		await uiStore.set('ui', { ...current, lastView: { ...lastViews.value } })
	}

	async function setLibraryCollapsed(collapsed: boolean) {
		if (libraryCollapsed.value === collapsed) return
		libraryCollapsed.value = collapsed
		writeCachedLibraryCollapsed(collapsed)
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
