import type { Component, ComputedRef } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export type AppHeaderSearchVisibility = 'show' | 'hide'

export type AppHeaderBreadcrumbItem = {
	label: string
	to?: RouteLocationRaw
	icon?: string
	description?: string
}

export type AppHeaderLeadingPill = {
	label: string
	icon: string
	pillClass: string
	to?: RouteLocationRaw
}

export type AppHeaderContribution = {
	leading?: AppHeaderLeadingPill | null
	breadcrumb?: readonly AppHeaderBreadcrumbItem[]
	center?: Component | null
	rightPrimary?: Component | null
	rightActions?: Component | null
	search?: AppHeaderSearchVisibility
}

export type AppHeaderResolvedState = {
	leading: AppHeaderLeadingPill | null
	breadcrumb: readonly AppHeaderBreadcrumbItem[]
	center: Component | null
	rightPrimary: Component | null
	rightActions: Component | null
	search: AppHeaderSearchVisibility
	showDefaultSearch: boolean
	sources: readonly string[]
}

export type AppHeaderLayerSnapshot = {
	id: number
	source: string
	contribution: AppHeaderContribution
}

export type AppHeaderLayerRegistration = {
	readonly id: number
	readonly source: string
	update: (contribution: AppHeaderContribution) => void
	remove: () => void
}

export type AppHeaderController = {
	readonly state: ComputedRef<AppHeaderResolvedState>
	registerLayer: (source?: string) => AppHeaderLayerRegistration
}
