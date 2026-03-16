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
import { createModalLayerUi } from '@/config/ui-layer'

import { useAssetsNotesPage } from './useAssetsNotesPage'

export function useAssetsNotesPageFacade() {
	const headerMotion = useAppContentMotionPreset('drawerSection', 'sectionBase')
	const layoutMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 18)
	const noteItemPreset = useMotionPreset('listItem')
	const modalBodyMotion = useInteractionMotionPreset('modalSection')
	const modalFooterMotion = useInteractionMotionPresetWithDelay('statusFeedback', 20)
	const {
		t,
		loading,
		loadErrorMessage,
		showLoadErrorState,
		selectedNote,
		editOpen,
		searchKeyword,
		editForm,
		filteredNotes,
		refresh,
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
		loadErrorMessage,
		showLoadErrorState,
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
		refresh,
		openEditor,
		onCreateNew,
		closeEditor,
		onSave,
		onDelete,
	}
}
