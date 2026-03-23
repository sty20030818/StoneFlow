import { refDebounced, useAsyncState } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useErrorHandler } from '@/composables/base/useErrorHandler'
import { useLoadErrorFeedback } from '@/composables/base/useLoadErrorFeedback'
import { noteSubmitSchema } from '@/composables/domain/validation/forms'
import { validateWithZod } from '@/composables/base/zod'

import type { AssetNote } from '../model'
import { createAssetNote, deleteAssetNote, updateAssetNote } from '../mutations'
import { listAssetNotes } from '../queries'

export function useAssetsNotesPage() {
	const { t } = useI18n({ useScope: 'global' })
	const { handleApiError, handleSuccess, handleValidationError } = useErrorHandler()

	const selectedNote = ref<AssetNote | null>(null)
	const editOpen = ref(false)
	const searchKeyword = ref('')
	const debouncedSearchKeyword = refDebounced(searchKeyword, 180)
	const loadError = ref<unknown | null>(null)

	const {
		state: notes,
		isLoading: loading,
		execute: executeRefresh,
	} = useAsyncState(() => listAssetNotes(), [] as AssetNote[], {
		immediate: true,
		resetOnExecute: false,
		onSuccess: () => {
			loadError.value = null
		},
		onError: (error) => {
			loadError.value = error
		},
	})
	const { loadErrorMessage, showLoadErrorState } = useLoadErrorFeedback({
		error: loadError,
		hasData: computed(() => notes.value.length > 0),
		loading,
		toastTitle: computed(() => t('assets.notes.toast.loadFailedTitle')),
	})

	const editForm = ref({
		title: '',
		content: '',
		linkedProjectId: '',
		linkedTaskId: '',
	})

	const filteredNotes = computed(() => {
		let result = notes.value
		if (debouncedSearchKeyword.value.trim()) {
			const keyword = debouncedSearchKeyword.value.trim().toLowerCase()
			result = result.filter((note) => {
				if (note.title.toLowerCase().includes(keyword)) return true
				if (note.content.toLowerCase().includes(keyword)) return true
				return false
			})
		}
		return result.sort((a, b) => b.updatedAt - a.updatedAt)
	})

	function openEditor(note: AssetNote) {
		selectedNote.value = note
		editForm.value = {
			title: note.title,
			content: note.content,
			linkedProjectId: note.linkedProjectId ?? '',
			linkedTaskId: note.linkedTaskId ?? '',
		}
		editOpen.value = true
	}

	function onCreateNew() {
		openEditor({
			id: '',
			title: '',
			content: '',
			excerpt: null,
			tags: [],
			favorite: false,
			linkedProjectId: null,
			linkedTaskId: null,
			syncState: 'local',
			createdAt: Date.now(),
			updatedAt: Date.now(),
		})
	}

	function closeEditor() {
		editOpen.value = false
		selectedNote.value = null
	}

	async function refresh() {
		await executeRefresh(0)
	}

	async function onSave() {
		if (!selectedNote.value) return
		const validation = validateWithZod(noteSubmitSchema, { title: editForm.value.title })
		if (!validation.ok) {
			handleValidationError(validation.message)
			return
		}

		try {
			const payload = {
				...editForm.value,
				linkedProjectId: editForm.value.linkedProjectId.trim() || null,
				linkedTaskId: editForm.value.linkedTaskId.trim() || null,
			}
			if (selectedNote.value.id) {
				await updateAssetNote(selectedNote.value.id, payload)
				handleSuccess(t('assets.common.toast.savedTitle'))
			} else {
				await createAssetNote(payload)
				handleSuccess(t('assets.common.toast.createdTitle'))
			}
			await refresh()
			closeEditor()
		} catch (error) {
			handleApiError(error, {
				title: t('assets.common.toast.saveFailedTitle'),
			})
		}
	}

	async function onDelete(id: string) {
		try {
			await deleteAssetNote(id)
			handleSuccess(t('assets.common.toast.deletedTitle'))
			if (selectedNote.value?.id === id) {
				closeEditor()
			}
			await refresh()
		} catch (error) {
			handleApiError(error, {
				title: t('assets.common.toast.deleteFailedTitle'),
			})
		}
	}

	return {
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
	}
}
