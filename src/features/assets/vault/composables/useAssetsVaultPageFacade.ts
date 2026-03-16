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

import { useAssetsVaultPage } from './useAssetsVaultPage'

export function useAssetsVaultPageFacade() {
	const headerMotion = useAppContentMotionPreset('drawerSection', 'sectionBase')
	const layoutMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 18)
	const folderMotion = useAppContentMotionPreset('card', 'sectionBase', 30)
	const listMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 42)
	const entryItemPreset = useMotionPreset('listItem')
	const modalBodyMotion = useInteractionMotionPreset('modalSection')
	const modalFooterMotion = useInteractionMotionPresetWithDelay('statusFeedback', 20)
	const {
		t,
		loading,
		loadErrorMessage,
		showLoadErrorState,
		selectedEntry,
		editOpen,
		selectedFolder,
		searchKeyword,
		showValue,
		editForm,
		typeOptions,
		folders,
		filteredEntries,
		typeLabel,
		refresh,
		openEditor,
		onCreateNew,
		closeEditor,
		onCopy,
		onSave,
		onDelete,
	} = useAssetsVaultPage()

	const vaultModalUi = createModalLayerUi({
		width: 'sm:max-w-2xl',
		rounded: 'rounded-2xl',
	})

	const entryItemMotions = computed(() =>
		createStaggeredEnterMotions(filteredEntries.value.length, entryItemPreset.value, getAppStaggerDelay, {
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
		selectedEntry,
		editOpen,
		selectedFolder,
		searchKeyword,
		showValue,
		editForm,
		typeOptions,
		folders,
		filteredEntries,
		typeLabel,
		vaultModalUi,
		entryItemMotions,
		refresh,
		openEditor,
		onCreateNew,
		closeEditor,
		onCopy,
		onSave,
		onDelete,
	}
}
