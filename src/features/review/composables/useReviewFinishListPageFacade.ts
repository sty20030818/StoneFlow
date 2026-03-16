import { computed } from 'vue'

import {
	DEFAULT_STAGGER_MOTION_LIMIT,
	createStaggeredEnterMotions,
	getAppStaggerDelay,
	useAppContentMotionPreset,
	useCardHoverMotionPreset,
	useInteractionMotionPresetWithDelay,
} from '@/composables/base/motion'
import { createModalLayerUi } from '@/config/ui-layer'

import { useReviewFinishList } from './useReviewFinishList'

export function useReviewFinishListPageFacade() {
	const headerMotion = useAppContentMotionPreset('drawerSection', 'sectionBase')
	const filtersMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 18)
	const groupItemMotionPreset = useCardHoverMotionPreset()
	const reflectionBodyMotion = useInteractionMotionPresetWithDelay('modalSection', 24)
	const reflectionFooterMotion = useInteractionMotionPresetWithDelay('statusFeedback', 44)
	const {
		t,
		loading,
		spaceFilter,
		projectFilter,
		dateRange,
		tagKeyword,
		reflectionOpen,
		reflectionTask,
		reflectionText,
		spaceOptions,
		projectOptions,
		dateRangeOptions,
		projectGroups,
		stats,
		formatDateTime,
		formatDuration,
		onOpenReflection,
		onReflectionSave,
	} = useReviewFinishList()

	const groupMotions = computed(() =>
		createStaggeredEnterMotions(projectGroups.value.length, groupItemMotionPreset.value, getAppStaggerDelay, {
			limit: DEFAULT_STAGGER_MOTION_LIMIT,
		}),
	)
	const reflectionModalUi = createModalLayerUi({
		width: 'sm:max-w-md',
	})

	return {
		t,
		headerMotion,
		filtersMotion,
		reflectionBodyMotion,
		reflectionFooterMotion,
		loading,
		spaceFilter,
		projectFilter,
		dateRange,
		tagKeyword,
		reflectionOpen,
		reflectionTask,
		reflectionText,
		spaceOptions,
		projectOptions,
		dateRangeOptions,
		projectGroups,
		stats,
		groupMotions,
		reflectionModalUi,
		formatDateTime,
		formatDuration,
		onOpenReflection,
		onReflectionSave,
	}
}
