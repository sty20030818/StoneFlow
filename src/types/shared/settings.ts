import type { SpaceId } from '@/types/domain/space'

export type HomeView = 'today' | 'projects' | 'focus' | 'inbox'
export type InfoDensity = 'comfortable' | 'compact'
export type ExitMode = 'workspace' | 'library' | 'unknown'

export type SettingsModel = {
	homeView: HomeView
	density: InfoDensity
	autoStart: boolean
	activeSpaceId: SpaceId
}

export type WorkspaceLastView = {
	route: string
	spaceId: SpaceId
	projectId: string | null
	updatedAt: number
}

export type LibraryLastView = {
	route: string
	updatedAt: number
}

export type UiState = {
	projectTreeExpanded: Record<string, string[]>
	libraryCollapsed: boolean
	workspaceLastViews: Record<SpaceId, WorkspaceLastView | null>
	workspaceLastActiveSpaceId: SpaceId
	libraryLastView: LibraryLastView | null
	lastExitMode: ExitMode
}
