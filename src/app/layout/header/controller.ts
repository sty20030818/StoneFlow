import { computed, markRaw, shallowRef } from 'vue'

import type {
	AppHeaderContribution,
	AppHeaderController,
	AppHeaderLayerRegistration,
	AppHeaderLayerSnapshot,
	AppHeaderResolvedState,
} from './types'

const EMPTY_BREADCRUMB: readonly [] = []

function normalizeContribution(contribution: AppHeaderContribution): AppHeaderContribution {
	const normalized: AppHeaderContribution = {}

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

export function resolveAppHeaderState(layers: readonly AppHeaderLayerSnapshot[]): AppHeaderResolvedState {
	let leading: AppHeaderResolvedState['leading'] = null
	let breadcrumb = EMPTY_BREADCRUMB as AppHeaderResolvedState['breadcrumb']
	let center: AppHeaderResolvedState['center'] = null
	let rightPrimary: AppHeaderResolvedState['rightPrimary'] = null
	let rightActions: AppHeaderResolvedState['rightActions'] = null
	let search: AppHeaderResolvedState['search'] = 'show'

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

export function createAppHeaderController(): AppHeaderController {
	let nextLayerId = 0
	const layers = shallowRef<readonly AppHeaderLayerSnapshot[]>([])
	const state = computed(() => resolveAppHeaderState(layers.value))

	function updateLayer(id: number, contribution: AppHeaderContribution) {
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

	function registerLayer(source = 'anonymous'): AppHeaderLayerRegistration {
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
