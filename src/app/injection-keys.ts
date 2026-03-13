import type { InjectionKey } from 'vue'

export type OpenCreateProjectModal = (spaceId?: string) => void
export type OpenCreateTaskModal = (spaceId?: string) => void

export type CommandPaletteController = {
	open: () => void
}

export const OPEN_CREATE_PROJECT_MODAL_KEY: InjectionKey<OpenCreateProjectModal> = Symbol('openCreateProjectModal')
export const OPEN_CREATE_TASK_MODAL_KEY: InjectionKey<OpenCreateTaskModal> = Symbol('openCreateTaskModal')
export const COMMAND_PALETTE_KEY: InjectionKey<CommandPaletteController> = Symbol('commandPalette')
