import { SPACE_IDS, type SpaceId } from '@/config/space'
import type { LaunchIntent, StartupSnapshotV2 } from '@/types/shared/settings'

export type StartupTarget = {
	path: string
	query?: Record<string, string>
}

export const STARTUP_SNAPSHOT_VERSION = 2 as const
export const STARTUP_FALLBACK_SPACE_ID: SpaceId = 'work'

function isKnownSpaceId(value: string): value is SpaceId {
	return (SPACE_IDS as readonly string[]).includes(value)
}

export function normalizeSpaceId(value: string | null | undefined): SpaceId {
	if (typeof value === 'string' && isKnownSpaceId(value)) {
		return value
	}
	return STARTUP_FALLBACK_SPACE_ID
}

export function buildFullPath(route: string, projectId: string | null | undefined): string {
	if (!projectId) return route
	const query = new URLSearchParams({ project: projectId }).toString()
	return `${route}?${query}`
}

export function buildStartupSnapshotV2(input: {
	fullPath: string
	route: string
	activeSpaceId: string
	projectId: string | null | undefined
	updatedAt?: number
}): StartupSnapshotV2 {
	const route = normalizeRoutePath(input.route) ?? `/space/${STARTUP_FALLBACK_SPACE_ID}`
	const activeSpaceId = normalizeSpaceId(input.activeSpaceId)
	const projectId = input.projectId ?? null
	const fullPath = normalizeFullPath(input.fullPath, route, projectId)

	return {
		version: STARTUP_SNAPSHOT_VERSION,
		fullPath,
		route,
		activeSpaceId,
		projectId,
		updatedAt: input.updatedAt ?? Date.now(),
	}
}

export function isStartupSnapshotV2(value: unknown): value is StartupSnapshotV2 {
	if (!value || typeof value !== 'object') return false
	const maybe = value as Partial<StartupSnapshotV2>
	return (
		maybe.version === STARTUP_SNAPSHOT_VERSION &&
		typeof maybe.fullPath === 'string' &&
		typeof maybe.route === 'string' &&
		typeof maybe.updatedAt === 'number' &&
		typeof maybe.activeSpaceId === 'string' &&
		isKnownSpaceId(maybe.activeSpaceId) &&
		(maybe.projectId === null || typeof maybe.projectId === 'string')
	)
}

export function resolveStartupTarget(snapshot: StartupSnapshotV2 | null, _intent: LaunchIntent): StartupTarget {
	if (!snapshot) {
		return resolveFallbackTarget(STARTUP_FALLBACK_SPACE_ID)
	}

	const route = normalizeRoutePath(snapshot.route)
	if (!route) {
		return resolveFallbackTarget(snapshot.activeSpaceId)
	}

	if (!snapshot.projectId) {
		return { path: route }
	}

	return {
		path: route,
		query: { project: snapshot.projectId },
	}
}

export function resolveFallbackTarget(spaceId: string | null | undefined): StartupTarget {
	const sid = normalizeSpaceId(spaceId)
	return { path: `/space/${sid}` }
}

export function normalizeRoutePath(route: string | null | undefined): string | null {
	if (!route || typeof route !== 'string') return null
	if (!route.startsWith('/')) return null
	return route
}

function normalizeFullPath(fullPath: string, route: string, projectId: string | null): string {
	if (typeof fullPath === 'string' && fullPath.startsWith('/')) {
		return fullPath
	}
	return buildFullPath(route, projectId)
}
