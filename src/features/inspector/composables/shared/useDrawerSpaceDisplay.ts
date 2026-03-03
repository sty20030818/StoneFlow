import { DEFAULT_SPACE_DISPLAY, SPACE_DISPLAY, type SpaceDisplay } from '@/config/space'

export function normalizeDrawerSpaceKey(spaceId: string | null | undefined): keyof typeof SPACE_DISPLAY | null {
	const normalized = spaceId?.trim().toLowerCase() ?? ''
	if (normalized === 'work' || normalized === 'personal' || normalized === 'study') {
		return normalized
	}
	return null
}

export function resolveDrawerSpaceDisplay(spaceId: string | null | undefined): SpaceDisplay {
	const key = normalizeDrawerSpaceKey(spaceId)
	if (!key) return DEFAULT_SPACE_DISPLAY
	return SPACE_DISPLAY[key]
}
