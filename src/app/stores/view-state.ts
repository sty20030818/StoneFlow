import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'

import { normalizeSpaceId } from '@/app/startup/route-memory-policy'
import {
	type UiNavigationState,
	UI_NAVIGATION_STATE_CACHE_KEY,
	createDefaultUiNavigationState,
	sanitizeUiNavigationState,
	sanitizeLibraryLastView,
	sanitizeWorkspaceLastView,
} from '@/app/stores/ui-navigation-storage'
import type { SpaceId } from '@/shared/types/domain/space'
import type { LibraryLastView, WorkspaceLastView } from '@/shared/types/shared/settings'

export const useViewStateStore = defineStore('view-state', () => {
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)

	// 轻量 UI 状态只在前端本地持久化，不再同步到额外的 UI 文件存储。
	const navigationState = useStorage<UiNavigationState>(UI_NAVIGATION_STATE_CACHE_KEY, createDefaultUiNavigationState())

	function updateNavigationState(patch: Partial<UiNavigationState>) {
		navigationState.value = {
			...navigationState.value,
			...patch,
		}
	}

	async function loadInternal() {
		navigationState.value = sanitizeUiNavigationState(navigationState.value)
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

	async function setLibraryCollapsed(collapsed: boolean) {
		if (navigationState.value.libraryCollapsed === collapsed) return
		updateNavigationState({ libraryCollapsed: collapsed })
	}

	async function recordWorkspaceExit(payload: WorkspaceLastView) {
		const next = sanitizeWorkspaceLastView(payload, payload.spaceId)
		if (!next) return

		const prev = navigationState.value.workspaceLastViews[next.spaceId]
		const unchanged =
			prev?.route === next.route &&
			prev?.projectId === next.projectId &&
			prev?.spaceId === next.spaceId &&
			navigationState.value.activeSpaceId === next.spaceId &&
			navigationState.value.lastExitMode === 'workspace'
		if (unchanged) return

		updateNavigationState({
			activeSpaceId: next.spaceId,
			lastExitMode: 'workspace',
			workspaceLastViews: {
				...navigationState.value.workspaceLastViews,
				[next.spaceId]: next,
			},
		})
	}

	async function recordLibraryExit(route: string) {
		const next: LibraryLastView = {
			route,
			updatedAt: Date.now(),
		}
		const sanitized = sanitizeLibraryLastView(next)
		if (!sanitized) return

		const unchanged =
			navigationState.value.libraryLastView?.route === sanitized.route &&
			navigationState.value.lastExitMode === 'library'
		if (unchanged) return

		updateNavigationState({
			libraryLastView: sanitized,
			lastExitMode: 'library',
		})
	}

	async function recordUnknownExit() {
		if (navigationState.value.lastExitMode === 'unknown') return
		updateNavigationState({ lastExitMode: 'unknown' })
	}

	async function syncActiveSpaceId(spaceId: SpaceId) {
		const nextSpaceId = normalizeSpaceId(spaceId)
		if (navigationState.value.activeSpaceId === nextSpaceId) return
		updateNavigationState({ activeSpaceId: nextSpaceId })
	}

	function getWorkspaceRestoreTarget(spaceId?: SpaceId): WorkspaceLastView | null {
		const targetSpaceId = normalizeSpaceId(spaceId ?? navigationState.value.activeSpaceId)
		return sanitizeWorkspaceLastView(navigationState.value.workspaceLastViews[targetSpaceId], targetSpaceId)
	}

	function getLibraryRestoreTarget(): LibraryLastView | null {
		return sanitizeLibraryLastView(navigationState.value.libraryLastView)
	}

	function getLastExitMode() {
		return navigationState.value.lastExitMode
	}

	return {
		loaded,
		libraryCollapsed: computed(() => navigationState.value.libraryCollapsed),
		workspaceLastViews: computed(() => navigationState.value.workspaceLastViews),
		activeSpaceId: computed(() => navigationState.value.activeSpaceId),
		libraryLastView: computed(() => navigationState.value.libraryLastView),
		lastExitMode: computed(() => navigationState.value.lastExitMode),
		load,
		setLibraryCollapsed,
		recordWorkspaceExit,
		recordLibraryExit,
		recordUnknownExit,
		syncActiveSpaceId,
		getWorkspaceRestoreTarget,
		getLibraryRestoreTarget,
		getLastExitMode,
	}
})
