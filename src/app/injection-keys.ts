import type { ComputedRef, InjectionKey } from 'vue'

export type OpenCreateProjectModal = (spaceId?: string) => void
export type OpenCreateTaskModal = (spaceId?: string) => void

export type CommandPaletteController = {
	open: () => void
}

export type WorkspaceBreadcrumbItem = {
	label: string
	to?: string
	icon?: string
	description?: string
}

export type WorkspaceBreadcrumbItemsRef = ComputedRef<WorkspaceBreadcrumbItem[]>

export const OPEN_CREATE_PROJECT_MODAL_KEY: InjectionKey<OpenCreateProjectModal> = Symbol('openCreateProjectModal')
export const OPEN_CREATE_TASK_MODAL_KEY: InjectionKey<OpenCreateTaskModal> = Symbol('openCreateTaskModal')
export const COMMAND_PALETTE_KEY: InjectionKey<CommandPaletteController> = Symbol('commandPalette')
export const WORKSPACE_BREADCRUMB_ITEMS_KEY: InjectionKey<WorkspaceBreadcrumbItemsRef> = Symbol(
	'workspaceBreadcrumbItems',
)
