import { SPACE_IDS, type SpaceId } from '@/config/space'
import { classifyRouteScope, normalizeSpaceId } from '@/startup/route-memory-policy'
import type { ExitMode, LibraryLastView, WorkspaceLastView } from '@/types/shared/settings'

export const UI_NAVIGATION_STATE_CACHE_KEY = 'ui_navigation_state'
export const UI_NAVIGATION_STATE_SCHEMA_VERSION = 1

const DEFAULT_LIBRARY_COLLAPSED = false
const DEFAULT_LIBRARY_LAST_VIEW: LibraryLastView | null = null
const DEFAULT_LAST_EXIT_MODE: ExitMode = 'unknown'
const DEFAULT_ACTIVE_SPACE_ID: SpaceId = 'work'

export type UiNavigationState = {
	schemaVersion: number
	activeSpaceId: SpaceId
	libraryCollapsed: boolean
	workspaceLastViews: Record<SpaceId, WorkspaceLastView | null>
	libraryLastView: LibraryLastView | null
	lastExitMode: ExitMode
}

export function createDefaultWorkspaceLastViews(): Record<SpaceId, WorkspaceLastView | null> {
	return {
		work: null,
		personal: null,
		study: null,
	}
}

export function createDefaultUiNavigationState(): UiNavigationState {
	return {
		schemaVersion: UI_NAVIGATION_STATE_SCHEMA_VERSION,
		activeSpaceId: DEFAULT_ACTIVE_SPACE_ID,
		libraryCollapsed: DEFAULT_LIBRARY_COLLAPSED,
		workspaceLastViews: createDefaultWorkspaceLastViews(),
		libraryLastView: DEFAULT_LIBRARY_LAST_VIEW,
		lastExitMode: DEFAULT_LAST_EXIT_MODE,
	}
}

export function isExitMode(value: unknown): value is ExitMode {
	return value === 'workspace' || value === 'library' || value === 'unknown'
}

export function sanitizeWorkspaceLastView(value: unknown, fallbackSpaceId: SpaceId): WorkspaceLastView | null {
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

export function sanitizeLibraryLastView(value: unknown): LibraryLastView | null {
	if (!value || typeof value !== 'object') return null
	const maybe = value as Partial<LibraryLastView>
	if (typeof maybe.route !== 'string') return null
	if (classifyRouteScope(maybe.route) !== 'library') return null

	return {
		route: maybe.route,
		updatedAt: typeof maybe.updatedAt === 'number' ? maybe.updatedAt : Date.now(),
	}
}

export function sanitizeWorkspaceLastViews(value: unknown): Record<SpaceId, WorkspaceLastView | null> {
	const next = createDefaultWorkspaceLastViews()
	if (!value || typeof value !== 'object') return next

	const maybe = value as Partial<Record<SpaceId, unknown>>
	for (const spaceId of SPACE_IDS) {
		next[spaceId] = sanitizeWorkspaceLastView(maybe[spaceId], spaceId)
	}
	return next
}

export function sanitizeUiNavigationState(value: unknown): UiNavigationState {
	if (!value || typeof value !== 'object') {
		return createDefaultUiNavigationState()
	}

	const maybe = value as Partial<UiNavigationState>
	return {
		schemaVersion: UI_NAVIGATION_STATE_SCHEMA_VERSION,
		activeSpaceId: normalizeSpaceId(maybe.activeSpaceId),
		libraryCollapsed:
			typeof maybe.libraryCollapsed === 'boolean' ? maybe.libraryCollapsed : DEFAULT_LIBRARY_COLLAPSED,
		workspaceLastViews: sanitizeWorkspaceLastViews(maybe.workspaceLastViews),
		libraryLastView: sanitizeLibraryLastView(maybe.libraryLastView),
		lastExitMode: isExitMode(maybe.lastExitMode) ? maybe.lastExitMode : DEFAULT_LAST_EXIT_MODE,
	}
}

export function readUiNavigationStateSnapshot(): UiNavigationState {
	if (typeof window === 'undefined') {
		return createDefaultUiNavigationState()
	}

	const raw = window.localStorage.getItem(UI_NAVIGATION_STATE_CACHE_KEY)
	if (!raw) return createDefaultUiNavigationState()

	try {
		return sanitizeUiNavigationState(JSON.parse(raw))
	} catch {
		return createDefaultUiNavigationState()
	}
}
