import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'

import { SPACE_IDS, type SpaceId } from '@/config/space'
import { DEFAULT_UI_STATE, uiStore, type UiState } from '@/services/tauri/store'
import { classifyRouteScope, normalizeSpaceId } from '@/startup/route-memory-policy'
import type { ExitMode, LibraryLastView, WorkspaceLastView } from '@/types/shared/settings'

const LIBRARY_COLLAPSED_CACHE_KEY = 'ui_library_collapsed_v1'
const WORKSPACE_LAST_VIEWS_CACHE_KEY = 'ui_workspace_last_views_v1'
const WORKSPACE_LAST_ACTIVE_SPACE_CACHE_KEY = 'ui_workspace_last_active_space_v1'
const LIBRARY_LAST_VIEW_CACHE_KEY = 'ui_library_last_view_v1'
const LAST_EXIT_MODE_CACHE_KEY = 'ui_last_exit_mode_v1'

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

function sanitizeUiState(value: unknown): UiState | null {
	if (!value || typeof value !== 'object') return null
	const maybe = value as Partial<UiState>
	if (!maybe.projectTreeExpanded || typeof maybe.projectTreeExpanded !== 'object') return null
	if (typeof maybe.libraryCollapsed !== 'boolean') return null
	if (!isExitMode(maybe.lastExitMode)) return null

	const workspaceLastViews = sanitizeWorkspaceLastViews(maybe.workspaceLastViews)
	if (!workspaceLastViews) return null

	return {
		projectTreeExpanded: maybe.projectTreeExpanded,
		libraryCollapsed: maybe.libraryCollapsed,
		workspaceLastViews,
		workspaceLastActiveSpaceId: normalizeSpaceId(maybe.workspaceLastActiveSpaceId),
		libraryLastView: sanitizeLibraryLastView(maybe.libraryLastView),
		lastExitMode: maybe.lastExitMode,
	}
}

export const useViewStateStore = defineStore('view-state', () => {
	const loaded = ref(false)
	const loadingPromise = ref<Promise<void> | null>(null)

	const libraryCollapsed = useStorage<boolean>(LIBRARY_COLLAPSED_CACHE_KEY, DEFAULT_UI_STATE.libraryCollapsed)
	const workspaceLastViews = useStorage<Record<SpaceId, WorkspaceLastView | null>>(
		WORKSPACE_LAST_VIEWS_CACHE_KEY,
		createDefaultWorkspaceLastViews(),
	)
	const workspaceLastActiveSpaceId = useStorage<SpaceId>(
		WORKSPACE_LAST_ACTIVE_SPACE_CACHE_KEY,
		DEFAULT_UI_STATE.workspaceLastActiveSpaceId,
	)
	const libraryLastView = useStorage<LibraryLastView | null>(LIBRARY_LAST_VIEW_CACHE_KEY, DEFAULT_UI_STATE.libraryLastView)
	const lastExitMode = useStorage<ExitMode>(LAST_EXIT_MODE_CACHE_KEY, DEFAULT_UI_STATE.lastExitMode)

	function buildUiState(projectTreeExpanded: Record<string, string[]>): UiState {
		return {
			projectTreeExpanded,
			libraryCollapsed: libraryCollapsed.value,
			workspaceLastViews: { ...workspaceLastViews.value },
			workspaceLastActiveSpaceId: normalizeSpaceId(workspaceLastActiveSpaceId.value),
			libraryLastView: libraryLastView.value ? { ...libraryLastView.value } : null,
			lastExitMode: isExitMode(lastExitMode.value) ? lastExitMode.value : 'unknown',
		}
	}

	function resetMemoryState() {
		libraryCollapsed.value = DEFAULT_UI_STATE.libraryCollapsed
		workspaceLastViews.value = createDefaultWorkspaceLastViews()
		workspaceLastActiveSpaceId.value = DEFAULT_UI_STATE.workspaceLastActiveSpaceId
		libraryLastView.value = DEFAULT_UI_STATE.libraryLastView
		lastExitMode.value = DEFAULT_UI_STATE.lastExitMode
	}

	async function persistUiState() {
		const current = await uiStore.get<UiState>('ui')
		const projectTreeExpanded =
			current?.projectTreeExpanded && typeof current.projectTreeExpanded === 'object' ? current.projectTreeExpanded : {}
		const nextUiState = buildUiState(projectTreeExpanded)
		await uiStore.set('ui', nextUiState)
	}

	async function loadInternal() {
		const raw = await uiStore.get<UiState>('ui')
		const next = sanitizeUiState(raw)

		// 一步到位：旧结构或损坏结构全部重置，不做迁移兼容。
		if (!next) {
			resetMemoryState()
			await persistUiState()
			loaded.value = true
			return
		}

		libraryCollapsed.value = next.libraryCollapsed
		workspaceLastViews.value = next.workspaceLastViews
		workspaceLastActiveSpaceId.value = next.workspaceLastActiveSpaceId
		libraryLastView.value = next.libraryLastView
		lastExitMode.value = next.lastExitMode
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
		await persistUiState()
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
		await persistUiState()
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
		await persistUiState()
	}

	async function recordUnknownExit() {
		if (lastExitMode.value === 'unknown') return
		lastExitMode.value = 'unknown'
		await persistUiState()
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

	async function flush() {
		await persistUiState()
		await uiStore.save()
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
		flush,
	}
})
