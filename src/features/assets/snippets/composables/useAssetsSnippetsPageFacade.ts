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

import { useAssetsSnippetsPage } from './useAssetsSnippetsPage'

export function useAssetsSnippetsPageFacade() {
	const headerMotion = useAppContentMotionPreset('drawerSection', 'sectionBase')
	const layoutMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 18)
	const folderMotion = useAppContentMotionPreset('card', 'sectionBase', 30)
	const listMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 42)
	const snippetItemPreset = useMotionPreset('listItem')
	const modalBodyMotion = useInteractionMotionPreset('modalSection')
	const modalFooterMotion = useInteractionMotionPresetWithDelay('statusFeedback', 20)
	const {
		t,
		loading,
		loadErrorMessage,
		showLoadErrorState,
		selectedSnippet,
		editOpen,
		selectedFolder,
		searchKeyword,
		editForm,
		tagsInput,
		folders,
		filteredSnippets,
		refresh,
		openEditor,
		onCreateNew,
		closeEditor,
		onTagsBlur,
		onSave,
		onDelete,
	} = useAssetsSnippetsPage()

	const snippetModalUi = createModalLayerUi({
		width: 'sm:max-w-3xl',
		rounded: 'rounded-2xl',
	})

	const snippetItemMotions = computed(() =>
		createStaggeredEnterMotions(filteredSnippets.value.length, snippetItemPreset.value, getAppStaggerDelay, {
			limit: DEFAULT_STAGGER_MOTION_LIMIT,
		}),
	)

	return {
		t,
		headerMotion,
		layoutMotion,
		folderMotion,
		loadErrorMessage,
		listMotion,
		modalBodyMotion,
		modalFooterMotion,
		loading,
		showLoadErrorState,
		selectedSnippet,
		editOpen,
		selectedFolder,
		searchKeyword,
		editForm,
		tagsInput,
		folders,
		filteredSnippets,
		snippetModalUi,
		snippetItemMotions,
		refresh,
		openEditor,
		onCreateNew,
		closeEditor,
		onTagsBlur,
		onSave,
		onDelete,
	}
}
