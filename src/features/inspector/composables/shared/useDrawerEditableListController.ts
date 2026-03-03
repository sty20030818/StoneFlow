import { ref } from 'vue'

import type { DrawerEditInteractionHandlers } from '../types'

export function useDrawerEditableListController(params: {
	interaction: DrawerEditInteractionHandlers
	onItemInput: (index: number) => void
	onFlushEdits: () => void
}) {
	const editingIndex = ref<number | null>(null)
	const draftErrorVisible = ref(false)

	function onDraftInput(value: string) {
		if (draftErrorVisible.value && value.trim()) {
			draftErrorVisible.value = false
		}
	}

	function setDraftConfirmResult(ok: boolean) {
		draftErrorVisible.value = !ok
	}

	function resetDraftError() {
		draftErrorVisible.value = false
	}

	function onEditOpenChange(index: number, open: boolean) {
		if (open) {
			editingIndex.value = index
			params.interaction.onEditStart()
			params.onItemInput(index)
			return
		}

		if (editingIndex.value === index) {
			editingIndex.value = null
		}
		params.interaction.onEditEnd()
		params.onFlushEdits()
	}

	return {
		editingIndex,
		draftErrorVisible,
		onDraftInput,
		setDraftConfirmResult,
		resetDraftError,
		onEditOpenChange,
	}
}
