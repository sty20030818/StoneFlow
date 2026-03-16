import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'

import { SPACE_IDS, type SpaceId } from '@/config/space'
import { classifyRouteScope, normalizeSpaceId } from '@/startup/route-memory-policy'
import type { ExitMode, LibraryLastView, WorkspaceLastView } from '@/types/shared/settings'

const LIBRARY_COLLAPSED_CACHE_KEY = 'ui_library_collapsed_v1'
const WORKSPACE_LAST_VIEWS_CACHE_KEY = 'ui_workspace_last_views_v1'
const WORKSPACE_LAST_ACTIVE_SPACE_CACHE_KEY = 'ui_workspace_last_active_space_v1'
const LIBRARY_LAST_VIEW_CACHE_KEY = 'ui_library_last_view_v1'
const LAST_EXIT_MODE_CACHE_KEY = 'ui_last_exit_mode_v1'
const DEFAULT_LIBRARY_COLLAPSED = false
const DEFAULT_WORKSPACE_LAST_ACTIVE_SPACE_ID: SpaceId = 'work'
const DEFAULT_LIBRARY_LAST_VIEW: LibraryLastView | null = null
const DEFAULT_LAST_EXIT_MODE: ExitMode = 'unknown'

function createDefaultWorkspaceLastViews(): Record<SpaceId, WorkspaceLastView | null> {
	return {
		work: null,
		personal: null,
		study: null,
	}
}

function isExitMode(value: unknown): value is ExitMode {
	return value === 'workspace' || value === 'library' || value === 'unknown'
}

function sanitizeWorkspaceLastView(value: unknown, fallbackSpaceId: SpaceId): WorkspaceLastView | null {
	if (!value || typeof value !== 'object') return null
	const maybe = value as Partial<WorkspaceLastView>
	if (typeof maybe.route !== 'string') return null

	const spaceId = normalizeSpaceId(maybe.spaceId ?? fallbackSpaceId)
	const scope = classifyRouteScope(maybe.route)
	if (scope !== 'workspace') return null

	let route = maybe.route
	if (route === '/all-tasks') {
		route = `/space/${spaceId}`
	}
	if (route.startsWith('/space/')) {
		route = `/space/${spaceId}`
	}

	const projectId = route.startsWith('/space/') ? (maybe.projectId ?? null) : null
	const updatedAt = typeof maybe.updatedAt === 'number' ? maybe.updatedAt : Date.now()

	return {
		route,
		spaceId,
		projectId,
		updatedAt,
	}
}

function sanitizeLibraryLastView(value: unknown): LibraryLastView | null {
	if (!value || typeof value !== 'object') return null
	const maybe = value as Partial<LibraryLastView>
	if (typeof maybe.route !== 'string') return null
	if (classifyRouteScope(maybe.route) !== 'library') return null

	return {
		route: maybe.route,
		updatedAt: typeof maybe.updatedAt === 'number' ? maybe.updatedAt : Date.now(),
	}
}

function sanitizeWorkspaceLastViews(value: unknown): Record<SpaceId, WorkspaceLastView | null> | null {
	if (!value || typeof value !== 'object') return null
	const maybe = value as Partial<Record<SpaceId, unknown>>
	const next = createDefaultWorkspaceLastViews()
	for (const spaceId of SPACE_IDS) {
		next[spaceId] = sanitizeWorkspaceLastView(maybe[spaceId], spaceId)
	}
	return next
}

export const useViewStateStore = defineStore('view-state', () => {
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)

	// 轻量 UI 状态只在前端本地持久化，不再同步到额外的 UI 文件存储。
	const libraryCollapsed = useStorage<boolean>(LIBRARY_COLLAPSED_CACHE_KEY, DEFAULT_LIBRARY_COLLAPSED)
	const workspaceLastViews = useStorage<Record<SpaceId, WorkspaceLastView | null>>(
		WORKSPACE_LAST_VIEWS_CACHE_KEY,
		createDefaultWorkspaceLastViews(),
	)
	const workspaceLastActiveSpaceId = useStorage<SpaceId>(
		WORKSPACE_LAST_ACTIVE_SPACE_CACHE_KEY,
		DEFAULT_WORKSPACE_LAST_ACTIVE_SPACE_ID,
	)
	const libraryLastView = useStorage<LibraryLastView | null>(LIBRARY_LAST_VIEW_CACHE_KEY, DEFAULT_LIBRARY_LAST_VIEW)
	const lastExitMode = useStorage<ExitMode>(LAST_EXIT_MODE_CACHE_KEY, DEFAULT_LAST_EXIT_MODE)

	function resetMemoryState() {
		libraryCollapsed.value = DEFAULT_LIBRARY_COLLAPSED
		workspaceLastViews.value = createDefaultWorkspaceLastViews()
		workspaceLastActiveSpaceId.value = DEFAULT_WORKSPACE_LAST_ACTIVE_SPACE_ID
		libraryLastView.value = DEFAULT_LIBRARY_LAST_VIEW
		lastExitMode.value = DEFAULT_LAST_EXIT_MODE
	}

	async function loadInternal() {
		const nextWorkspaceLastViews = sanitizeWorkspaceLastViews(workspaceLastViews.value)
		if (!nextWorkspaceLastViews) {
			resetMemoryState()
			loaded.value = true
			return
		}

		libraryCollapsed.value =
			typeof libraryCollapsed.value === 'boolean' ? libraryCollapsed.value : DEFAULT_LIBRARY_COLLAPSED
		workspaceLastViews.value = nextWorkspaceLastViews
		workspaceLastActiveSpaceId.value = normalizeSpaceId(workspaceLastActiveSpaceId.value)
		libraryLastView.value = sanitizeLibraryLastView(libraryLastView.value)
		lastExitMode.value = isExitMode(lastExitMode.value) ? lastExitMode.value : DEFAULT_LAST_EXIT_MODE
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
		if (libraryCollapsed.value === collapsed) return
		libraryCollapsed.value = collapsed
	}

	async function recordWorkspaceExit(payload: WorkspaceLastView) {
		const next = sanitizeWorkspaceLastView(payload, payload.spaceId)
		if (!next) return

		const prev = workspaceLastViews.value[next.spaceId]
		const unchanged =
			prev?.route === next.route &&
			prev?.projectId === next.projectId &&
			prev?.spaceId === next.spaceId &&
			workspaceLastActiveSpaceId.value === next.spaceId &&
			lastExitMode.value === 'workspace'
		if (unchanged) return

		workspaceLastViews.value = {
			...workspaceLastViews.value,
			[next.spaceId]: next,
		}
		workspaceLastActiveSpaceId.value = next.spaceId
		lastExitMode.value = 'workspace'
	}

	async function recordLibraryExit(route: string) {
		if (classifyRouteScope(route) !== 'library') return
		const next: LibraryLastView = {
			route,
			updatedAt: Date.now(),
		}

		const unchanged = libraryLastView.value?.route === next.route && lastExitMode.value === 'library'
		if (unchanged) return

		libraryLastView.value = next
		lastExitMode.value = 'library'
	}

	async function recordUnknownExit() {
		if (lastExitMode.value === 'unknown') return
		lastExitMode.value = 'unknown'
	}

	function getWorkspaceRestoreTarget(spaceId?: SpaceId): WorkspaceLastView | null {
		const targetSpaceId = normalizeSpaceId(spaceId ?? workspaceLastActiveSpaceId.value)
		return sanitizeWorkspaceLastView(workspaceLastViews.value[targetSpaceId], targetSpaceId)
	}

	function getLibraryRestoreTarget(): LibraryLastView | null {
		return sanitizeLibraryLastView(libraryLastView.value)
	}

	function getLastExitMode(): ExitMode {
		return isExitMode(lastExitMode.value) ? lastExitMode.value : 'unknown'
	}

	function getWorkspaceLastActiveSpaceId(): SpaceId {
		return normalizeSpaceId(workspaceLastActiveSpaceId.value)
	}

	return {
		loaded,
		libraryCollapsed: computed(() => libraryCollapsed.value),
		workspaceLastViews: computed(() => workspaceLastViews.value),
		workspaceLastActiveSpaceId: computed(() => workspaceLastActiveSpaceId.value),
		libraryLastView: computed(() => libraryLastView.value),
		lastExitMode: computed(() => lastExitMode.value),
		load,
		setLibraryCollapsed,
		recordWorkspaceExit,
		recordLibraryExit,
		recordUnknownExit,
		getWorkspaceRestoreTarget,
		getLibraryRestoreTarget,
		getLastExitMode,
		getWorkspaceLastActiveSpaceId,
	}
})
