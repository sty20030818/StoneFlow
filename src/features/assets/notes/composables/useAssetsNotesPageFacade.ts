import { computed } from 'vue'

import {
	DEFAULT_STAGGER_MOTION_LIMIT,
	createStaggeredEnterMotions,
	getAppStaggerDelay,
	useAppContentMotionPreset,
	useMotionPreset,
} from '@/composables/base/motion'

import { useAssetsNotesPage } from './useAssetsNotesPage'

export function useAssetsNotesPageFacade() {
	const workspaceMotion = useAppContentMotionPreset('drawerSection', 'sectionBase')
	const noteItemPreset = useMotionPreset('listItem')
	const pageState = useAssetsNotesPage()

	const noteItemMotions = computed(() =>
		createStaggeredEnterMotions(pageState.filteredNotes.value.length, noteItemPreset.value, getAppStaggerDelay, {
			limit: DEFAULT_STAGGER_MOTION_LIMIT,
		}),
	)

	return {
		...pageState,
		workspaceMotion,
		noteItemMotions,
	}
}
