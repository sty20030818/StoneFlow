import { computed } from 'vue'

import {
	DEFAULT_STAGGER_MOTION_LIMIT,
	getAppStaggerDelay,
	resolveStaggeredEnterMotion,
	toStaticMotionVariants,
	useAppMotionPreset,
	useMotionPreset,
	useMotionPresetWithDelay,
} from '@/composables/base/motion'
import { createModalLayerUi } from '@/config/ui-layer'

import { useAssetsDiaryPage } from './useAssetsDiaryPage'

export function useAssetsDiaryPageFacade() {
	const headerMotion = useAppMotionPreset('drawerSection', 'sectionBase')
	const timelineMotion = useAppMotionPreset('drawerSection', 'sectionBase', 20)
	const diaryItemPreset = useMotionPreset('card')
	const diaryItemStaticMotion = computed(() => toStaticMotionVariants(diaryItemPreset.value))
	const modalBodyMotion = useMotionPreset('modalSection')
	const modalFooterMotion = useMotionPresetWithDelay('statusFeedback', 20)
	const {
		t,
		loading,
		selectedEntry,
		editOpen,
		editForm,
		groupedEntries,
		selectEntry,
		onCreateNew,
		closeEditor,
		onSave,
		onDelete,
		goToFinishList,
	} = useAssetsDiaryPage()

	const diaryModalUi = createModalLayerUi({
		width: 'sm:max-w-2xl',
		rounded: 'rounded-2xl',
	})

	function getDiaryItemMotion(index: number) {
		// Diary 可能单日出现较多卡片，超过阈值后改静态，优先保证滚动流畅。
		return resolveStaggeredEnterMotion(index, diaryItemPreset.value, getAppStaggerDelay, {
			limit: DEFAULT_STAGGER_MOTION_LIMIT,
			fallback: diaryItemStaticMotion.value,
		})
	}

	return {
		t,
		headerMotion,
		timelineMotion,
		modalBodyMotion,
		modalFooterMotion,
		loading,
		selectedEntry,
		editOpen,
		editForm,
		groupedEntries,
		diaryModalUi,
		selectEntry,
		onCreateNew,
		closeEditor,
		onSave,
		onDelete,
		goToFinishList,
		getDiaryItemMotion,
	}
}
