import type { SpaceId } from '@/types/domain/space'

export type HomeView = 'today' | 'projects' | 'focus' | 'inbox'
export type InfoDensity = 'comfortable' | 'compact'

export type SettingsModel = {
	homeView: HomeView
	density: InfoDensity
	autoStart: boolean
	activeSpaceId: SpaceId
}

export type UiState = {
	projectTreeExpanded: Record<string, string[]>
}
