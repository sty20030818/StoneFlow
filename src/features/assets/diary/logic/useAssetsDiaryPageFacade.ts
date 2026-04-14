import { computed } from 'vue'

import {
	DEFAULT_STAGGER_MOTION_LIMIT,
	createStaggeredEnterMotions,
	getAppStaggerDelay,
	useAppContentMotionPreset,
	useMotionPreset,
} from '@/shared/composables/base/motion'

import { useAssetsDiaryPage } from './useAssetsDiaryPage'

export function useAssetsDiaryPageFacade() {
	const workspaceMotion = useAppContentMotionPreset('drawerSection', 'sectionBase')
	const diaryItemPreset = useMotionPreset('card')
	const pageState = useAssetsDiaryPage()

	const diaryItemMotions = computed(() =>
		createStaggeredEnterMotions(pageState.diaryEntries.value.length, diaryItemPreset.value, getAppStaggerDelay, {
			limit: DEFAULT_STAGGER_MOTION_LIMIT,
		}),
	)

	return {
		...pageState,
		workspaceMotion,
		diaryItemMotions,
	}
}
