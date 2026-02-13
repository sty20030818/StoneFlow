import { SPACE_IDS, type SpaceId } from '@/config/space'
import type { LibraryLastView, WorkspaceLastView } from '@/types/shared/settings'

export type RouteMemoryScope = 'workspace' | 'library' | 'settings' | 'unknown'

export type StartupRouteTarget = {
	path: string
	query?: Record<string, string>
}

const LIBRARY_ROUTES = new Set(['/finish-list', '/stats', '/logs', '/snippets', '/vault', '/notes', '/diary'])

function isKnownSpaceId(value: string): value is SpaceId {
	return (SPACE_IDS as readonly string[]).includes(value)
}

export function normalizeSpaceId(value: string | null | undefined): SpaceId {
	if (typeof value === 'string' && isKnownSpaceId(value)) {
		return value
	}
	return 'work'
}

export function isWorkspaceRoute(path: string): boolean {
	return path === '/all-tasks' || path === '/trash' || path.startsWith('/space/')
}

export function isLibraryRoute(path: string): boolean {
	return LIBRARY_ROUTES.has(path)
}

export function classifyRouteScope(path: string): RouteMemoryScope {
	if (!path || typeof path !== 'string') return 'unknown'
	if (path === '/settings' || path.startsWith('/settings/')) return 'settings'
	if (isWorkspaceRoute(path)) return 'workspace'
	if (isLibraryRoute(path)) return 'library'
	return 'unknown'
}

export function canonicalizeWorkspaceRoute(path: string, spaceId: SpaceId): string {
	if (path === '/all-tasks') {
		return `/space/${spaceId}`
	}
	return path
}

export function extractWorkspacePayload(input: {
	path: string
	projectId: string | null | undefined
	fallbackSpaceId: SpaceId
	updatedAt?: number
}): WorkspaceLastView | null {
	if (!isWorkspaceRoute(input.path)) return null

	const fallbackSpaceId = normalizeSpaceId(input.fallbackSpaceId)
	const updatedAt = input.updatedAt ?? Date.now()

	if (input.path === '/trash') {
		return {
			route: '/trash',
			spaceId: fallbackSpaceId,
			projectId: null,
			updatedAt,
		}
	}

	const match = input.path.match(/^\/space\/([^/]+)$/)
	if (match) {
		const spaceId = normalizeSpaceId(match[1])
		return {
			route: `/space/${spaceId}`,
			spaceId,
			projectId: input.projectId ?? null,
			updatedAt,
		}
	}

	return {
		route: canonicalizeWorkspaceRoute(input.path, fallbackSpaceId),
		spaceId: fallbackSpaceId,
		projectId: null,
		updatedAt,
	}
}

export function toWorkspaceRouteTarget(view: WorkspaceLastView): StartupRouteTarget {
	if (view.route.startsWith('/space/') && view.projectId) {
		return {
			path: view.route,
			query: { project: view.projectId },
		}
	}

	return { path: view.route }
}

export function toLibraryRouteTarget(view: LibraryLastView): StartupRouteTarget {
	return { path: view.route }
}

export function resolveLaunchHashTarget(hashAtBoot: string): StartupRouteTarget | null {
	if (!hashAtBoot || typeof hashAtBoot !== 'string' || !hashAtBoot.startsWith('#')) {
		return null
	}

	const raw = hashAtBoot.slice(1).trim()
	if (!raw || raw === '/') {
		return null
	}

	const normalizedRaw = raw.startsWith('/') ? raw : `/${raw}`
	try {
		const parsed = new URL(normalizedRaw, 'https://stoneflow.local')
		if (!parsed.pathname || parsed.pathname === '/') return null
		const query = Object.fromEntries(parsed.searchParams.entries())
		if (Object.keys(query).length === 0) {
			return { path: parsed.pathname }
		}
		return {
			path: parsed.pathname,
			query,
		}
	} catch {
		return null
	}
}
