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

import { useAssetsVaultPage } from './useAssetsVaultPage'

export function useAssetsVaultPageFacade() {
	const headerMotion = useAppMotionPreset('drawerSection', 'sectionBase')
	const layoutMotion = useAppMotionPreset('drawerSection', 'sectionBase', 18)
	const folderMotion = useAppMotionPreset('card', 'sectionBase', 30)
	const listMotion = useAppMotionPreset('drawerSection', 'sectionBase', 42)
	const entryItemPreset = useMotionPreset('listItem')
	const modalBodyMotion = useMotionPreset('modalSection')
	const modalFooterMotion = useMotionPresetWithDelay('statusFeedback', 20)
	const {
		t,
		loading,
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
		listMotion,
		modalBodyMotion,
		modalFooterMotion,
		loading,
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
		openEditor,
		onCreateNew,
		closeEditor,
		onCopy,
		onSave,
		onDelete,
	}
}
