import type { SpaceId } from '@/shared/types/domain/space'
import type { AppLocale } from '@/i18n/messages'

export type HomeView = 'today' | 'projects' | 'focus' | 'inbox'
export type InfoDensity = 'comfortable' | 'compact'
export type ExitMode = 'workspace' | 'library' | 'unknown'
export type ThemePreference = 'light' | 'dark' | 'system'

export type SettingsModel = {
	homeView: HomeView
	density: InfoDensity
	autoStart: boolean
	activeSpaceId: SpaceId
	locale: AppLocale | null
	themePreference: ThemePreference
	updaterAutoCheck: boolean
	updaterPromptInstall: boolean
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
