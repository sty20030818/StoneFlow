import { computed } from 'vue'

import {
	DEFAULT_STAGGER_MOTION_LIMIT,
	createStaggeredEnterMotions,
	getAppStaggerDelay,
	useAppMotionPreset,
	useMotionPreset,
	useMotionPresetWithDelay,
} from '@/composables/base/motion'
import { createModalLayerUi } from '@/config/ui-layer'

import { useAssetsNotesPage } from '../useAssetsNotesPage'

export function useAssetsNotesPageFacade() {
	const headerMotion = useAppMotionPreset('drawerSection', 'sectionBase')
	const layoutMotion = useAppMotionPreset('drawerSection', 'sectionBase', 18)
	const noteItemPreset = useMotionPreset('listItem')
	const modalBodyMotion = useMotionPreset('modalSection')
	const modalFooterMotion = useMotionPresetWithDelay('statusFeedback', 20)
	const {
		t,
		loading,
		selectedNote,
		editOpen,
		searchKeyword,
		editForm,
		filteredNotes,
		openEditor,
		onCreateNew,
		closeEditor,
		onSave,
		onDelete,
	} = useAssetsNotesPage()

	const noteModalUi = createModalLayerUi({
		width: 'sm:max-w-3xl',
		rounded: 'rounded-2xl',
	})

	const noteItemMotions = computed(() =>
		createStaggeredEnterMotions(filteredNotes.value.length, noteItemPreset.value, getAppStaggerDelay, {
			limit: DEFAULT_STAGGER_MOTION_LIMIT,
		}),
	)

	return {
		t,
		headerMotion,
		layoutMotion,
		modalBodyMotion,
		modalFooterMotion,
		loading,
		selectedNote,
		editOpen,
		searchKeyword,
		editForm,
		filteredNotes,
		noteModalUi,
		noteItemMotions,
		openEditor,
		onCreateNew,
		closeEditor,
		onSave,
		onDelete,
	}
}
