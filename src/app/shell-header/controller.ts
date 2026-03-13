import { computed, markRaw, shallowRef } from 'vue'

import type {
	ShellHeaderContribution,
	ShellHeaderController,
	ShellHeaderLayerRegistration,
	ShellHeaderLayerSnapshot,
	ShellHeaderResolvedState,
} from './types'

const EMPTY_BREADCRUMB: readonly [] = []

function normalizeContribution(contribution: ShellHeaderContribution): ShellHeaderContribution {
	const normalized: ShellHeaderContribution = {}

	if (contribution.leading !== undefined) {
		normalized.leading = contribution.leading ? { ...contribution.leading } : null
	}

	if (contribution.breadcrumb !== undefined) {
		normalized.breadcrumb = [...contribution.breadcrumb]
	}

	if (contribution.center !== undefined) {
		normalized.center = contribution.center ? markRaw(contribution.center) : null
	}

	if (contribution.rightPrimary !== undefined) {
		normalized.rightPrimary = contribution.rightPrimary ? markRaw(contribution.rightPrimary) : null
	}

	if (contribution.rightActions !== undefined) {
		normalized.rightActions = contribution.rightActions ? markRaw(contribution.rightActions) : null
	}

	if (contribution.search !== undefined) {
		normalized.search = contribution.search
	}

	return normalized
}

export function resolveShellHeaderState(layers: readonly ShellHeaderLayerSnapshot[]): ShellHeaderResolvedState {
	let leading: ShellHeaderResolvedState['leading'] = null
	let breadcrumb = EMPTY_BREADCRUMB as ShellHeaderResolvedState['breadcrumb']
	let center: ShellHeaderResolvedState['center'] = null
	let rightPrimary: ShellHeaderResolvedState['rightPrimary'] = null
	let rightActions: ShellHeaderResolvedState['rightActions'] = null
	let search: ShellHeaderResolvedState['search'] = 'show'

	for (const layer of layers) {
		const { contribution } = layer

		if (contribution.leading !== undefined) {
			leading = contribution.leading
		}

		if (contribution.breadcrumb !== undefined) {
			breadcrumb = contribution.breadcrumb
		}

		if (contribution.center !== undefined) {
			center = contribution.center
		}

		if (contribution.rightPrimary !== undefined) {
			rightPrimary = contribution.rightPrimary
		}

		if (contribution.rightActions !== undefined) {
			rightActions = contribution.rightActions
		}

		if (contribution.search !== undefined) {
			search = contribution.search
		}
	}

	return {
		leading,
		breadcrumb,
		center,
		rightPrimary,
		rightActions,
		search,
		showDefaultSearch: rightPrimary == null && search === 'show',
		sources: layers.map((layer) => layer.source),
	}
}

export function createShellHeaderController(): ShellHeaderController {
	let nextLayerId = 0
	const layers = shallowRef<readonly ShellHeaderLayerSnapshot[]>([])
	const state = computed(() => resolveShellHeaderState(layers.value))

	function updateLayer(id: number, contribution: ShellHeaderContribution) {
		const normalized = normalizeContribution(contribution)
		layers.value = layers.value.map((layer) => {
			if (layer.id !== id) return layer
			return {
				...layer,
				contribution: normalized,
			}
		})
	}

	function removeLayer(id: number) {
		layers.value = layers.value.filter((layer) => layer.id !== id)
	}

	function registerLayer(source = 'anonymous'): ShellHeaderLayerRegistration {
		const id = nextLayerId++
		let active = true

		layers.value = [
			...layers.value,
			{
				id,
				source,
				contribution: {},
			},
		]

		return {
			id,
			source,
			update(contribution) {
				if (!active) return
				updateLayer(id, contribution)
			},
			remove() {
				if (!active) return
				active = false
				removeLayer(id)
			},
		}
	}

	return {
		state,
		registerLayer,
	}
}
