import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'

import { uiStore, DEFAULT_UI_STATE, type UiState } from '@/services/tauri/store'
import { buildFullPath, buildStartupSnapshotV2, isStartupSnapshotV2 } from '@/startup/session-snapshot'
import type { LastViewState, StartupSnapshotV2 } from '@/types/shared/settings'

const LAST_VIEW_CACHE_KEY = 'ui_last_view_v1'
const LIBRARY_COLLAPSED_CACHE_KEY = 'ui_library_collapsed_v1'
const STARTUP_SNAPSHOT_CACHE_KEY = 'ui_startup_snapshot_v2'

export const useViewStateStore = defineStore('view-state', () => {
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)
	// 统一由 VueUse 管理本地缓存，避免手写 get/set 的重复与容错分散。
	const lastViews = useStorage<Record<string, LastViewState>>(LAST_VIEW_CACHE_KEY, {})
	const libraryCollapsed = useStorage<boolean>(LIBRARY_COLLAPSED_CACHE_KEY, false)
	const startupSnapshot = useStorage<StartupSnapshotV2 | null>(STARTUP_SNAPSHOT_CACHE_KEY, null)

	async function persistUiState() {
		const current = (await uiStore.get<UiState>('ui')) ?? DEFAULT_UI_STATE
		await uiStore.set('ui', {
			...current,
			lastView: { ...lastViews.value },
			libraryCollapsed: libraryCollapsed.value,
			startupSnapshot: startupSnapshot.value,
		})
	}

	async function loadInternal() {
		const val = await uiStore.get<UiState>('ui')
		if (val?.lastView) {
			lastViews.value = { ...val.lastView }
		}
		if (typeof val?.libraryCollapsed === 'boolean') {
			libraryCollapsed.value = val.libraryCollapsed
		}
		if (isStartupSnapshotV2(val?.startupSnapshot)) {
			startupSnapshot.value = val.startupSnapshot
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
			prev?.route === view.route &&
			prev?.spaceId === view.spaceId &&
			(prev?.projectId ?? null) === (view.projectId ?? null)
		) {
			return
		}
		lastViews.value = { ...lastViews.value, [spaceId]: view }
		await persistUiState()
	}

	async function setLibraryCollapsed(collapsed: boolean) {
		if (libraryCollapsed.value === collapsed) return
		libraryCollapsed.value = collapsed
		await persistUiState()
	}

	function getLastView(spaceId: string) {
		return lastViews.value[spaceId]
	}

	function getStartupSnapshot() {
		return isStartupSnapshotV2(startupSnapshot.value) ? startupSnapshot.value : null
	}

	function migrateLegacySnapshot(activeSpaceId: string) {
		const existing = getStartupSnapshot()
		if (existing) return existing
		const legacyView = getLastView(activeSpaceId)
		if (!legacyView?.route) return null

		const migrated = buildStartupSnapshotV2({
			fullPath: buildFullPath(legacyView.route, legacyView.projectId ?? null),
			route: legacyView.route,
			activeSpaceId: legacyView.spaceId ?? activeSpaceId,
			projectId: legacyView.projectId ?? null,
		})
		startupSnapshot.value = migrated
		void persistUiState()
		return migrated
	}

	async function setStartupSnapshot(snapshot: StartupSnapshotV2) {
		const prev = getStartupSnapshot()
		if (
			prev &&
			prev.fullPath === snapshot.fullPath &&
			prev.route === snapshot.route &&
			prev.activeSpaceId === snapshot.activeSpaceId &&
			prev.projectId === snapshot.projectId
		) {
			return
		}
		startupSnapshot.value = snapshot
		await persistUiState()
	}

	async function flush() {
		await persistUiState()
		await uiStore.save()
	}

	return {
		loaded,
		lastViews: computed(() => lastViews.value),
		libraryCollapsed: computed(() => libraryCollapsed.value),
		startupSnapshot: computed(() => startupSnapshot.value),
		load,
		setLastView,
		setLibraryCollapsed,
		getLastView,
		getStartupSnapshot,
		setStartupSnapshot,
		migrateLegacySnapshot,
		flush,
	}
})
