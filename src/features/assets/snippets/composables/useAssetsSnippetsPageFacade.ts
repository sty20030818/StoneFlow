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

import { useAssetsSnippetsPage } from './useAssetsSnippetsPage'

export function useAssetsSnippetsPageFacade() {
	const headerMotion = useAppMotionPreset('drawerSection', 'sectionBase')
	const layoutMotion = useAppMotionPreset('drawerSection', 'sectionBase', 18)
	const folderMotion = useAppMotionPreset('card', 'sectionBase', 30)
	const listMotion = useAppMotionPreset('drawerSection', 'sectionBase', 42)
	const snippetItemPreset = useMotionPreset('listItem')
	const modalBodyMotion = useMotionPreset('modalSection')
	const modalFooterMotion = useMotionPresetWithDelay('statusFeedback', 20)
	const {
		t,
		loading,
		selectedSnippet,
		editOpen,
		selectedFolder,
		searchKeyword,
		editForm,
		tagsInput,
		folders,
		filteredSnippets,
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
		listMotion,
		modalBodyMotion,
		modalFooterMotion,
		loading,
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
		openEditor,
		onCreateNew,
		closeEditor,
		onTagsBlur,
		onSave,
		onDelete,
	}
}
