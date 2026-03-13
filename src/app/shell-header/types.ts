import type { Component, ComputedRef } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export type ShellHeaderSearchVisibility = 'show' | 'hide'

export type ShellHeaderBreadcrumbItem = {
	label: string
	to?: RouteLocationRaw
	icon?: string
	description?: string
}

export type ShellHeaderContribution = {
	breadcrumb?: readonly ShellHeaderBreadcrumbItem[]
	center?: Component | null
	rightPrimary?: Component | null
	rightActions?: Component | null
	search?: ShellHeaderSearchVisibility
}

export type ShellHeaderResolvedState = {
	breadcrumb: readonly ShellHeaderBreadcrumbItem[]
	center: Component | null
	rightPrimary: Component | null
	rightActions: Component | null
	search: ShellHeaderSearchVisibility
	showDefaultSearch: boolean
	sources: readonly string[]
}

export type ShellHeaderLayerSnapshot = {
	id: number
	source: string
	contribution: ShellHeaderContribution
}

export type ShellHeaderLayerRegistration = {
	readonly id: number
	readonly source: string
	update: (contribution: ShellHeaderContribution) => void
	remove: () => void
}

export type ShellHeaderController = {
	readonly state: ComputedRef<ShellHeaderResolvedState>
	registerLayer: (source?: string) => ShellHeaderLayerRegistration
}
