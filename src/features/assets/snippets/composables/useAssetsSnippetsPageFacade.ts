import { computed } from 'vue'

import {
	DEFAULT_STAGGER_MOTION_LIMIT,
	createStaggeredEnterMotions,
	getAppStaggerDelay,
	useAppContentMotionPreset,
	useInteractionMotionPreset,
	useInteractionMotionPresetWithDelay,
	useMotionPreset,
} from '@/composables/base/motion'

import { useAssetsSnippetsPage } from './useAssetsSnippetsPage'

export function useAssetsSnippetsPageFacade() {
	const gridMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 24)
	const snippetCardPreset = useMotionPreset('listItem')
	const modalBodyMotion = useInteractionMotionPreset('modalSection')
	const modalFooterMotion = useInteractionMotionPresetWithDelay('statusFeedback', 20)

	const pageState = useAssetsSnippetsPage()

	const snippetItemMotions = computed(() =>
		createStaggeredEnterMotions(pageState.filteredSnippets.value.length, snippetCardPreset.value, getAppStaggerDelay, {
			limit: DEFAULT_STAGGER_MOTION_LIMIT,
		}),
	)

	return {
		...pageState,
		gridMotion,
		modalBodyMotion,
		modalFooterMotion,
		snippetItemMotions,
	}
}
