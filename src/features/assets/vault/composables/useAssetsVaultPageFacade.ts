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

import { useAssetsVaultPage } from './useAssetsVaultPage'

export function useAssetsVaultPageFacade() {
	const toolbarMotion = useAppContentMotionPreset('drawerSection', 'sectionBase')
	const gridMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 24)
	const entryItemPreset = useMotionPreset('listItem')
	const modalBodyMotion = useInteractionMotionPreset('modalSection')
	const modalFooterMotion = useInteractionMotionPresetWithDelay('statusFeedback', 20)

	const pageState = useAssetsVaultPage()

	const entryItemMotions = computed(() =>
		createStaggeredEnterMotions(pageState.filteredEntries.value.length, entryItemPreset.value, getAppStaggerDelay, {
			limit: DEFAULT_STAGGER_MOTION_LIMIT,
		}),
	)

	return {
		...pageState,
		toolbarMotion,
		gridMotion,
		modalBodyMotion,
		modalFooterMotion,
		entryItemMotions,
	}
}
