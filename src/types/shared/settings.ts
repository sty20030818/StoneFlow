import type { SpaceId } from '@/types/domain/space'

export type HomeView = 'today' | 'projects' | 'focus' | 'inbox'
export type InfoDensity = 'comfortable' | 'compact'

export type SettingsModel = {
	homeView: HomeView
	density: InfoDensity
	autoStart: boolean
	activeSpaceId: SpaceId
}

export type LastViewState = {
	route: string
	spaceId?: SpaceId | null
	projectId?: string | null
}

export type StartupSnapshotV2 = {
	version: 2
	fullPath: string
	route: string
	activeSpaceId: SpaceId
	projectId: string | null
	updatedAt: number
}

export type LaunchIntent = {
	hashAtBoot: string
	isFirstRun: boolean
}

export type UiState = {
	projectTreeExpanded: Record<string, string[]>
	lastView: Record<string, LastViewState>
	libraryCollapsed: boolean
	startupSnapshot: StartupSnapshotV2 | null
}
