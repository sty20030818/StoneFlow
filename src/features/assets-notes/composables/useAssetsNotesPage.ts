import { refDebounced, useAsyncState } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { noteSubmitSchema } from '@/composables/domain/validation/forms'
import { validateWithZod } from '@/composables/base/zod'
import { resolveErrorMessage } from '@/utils/error-message'

import type { NoteDto } from '../model'
import { createAssetNote, deleteAssetNote, updateAssetNote } from '../mutations'
import { listAssetNotes } from '../queries'

export function useAssetsNotesPage() {
	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })

	const selectedNote = ref<NoteDto | null>(null)
	const editOpen = ref(false)
	const searchKeyword = ref('')
	const debouncedSearchKeyword = refDebounced(searchKeyword, 180)

	const {
		state: notes,
		isLoading: loading,
		execute: executeRefresh,
	} = useAsyncState(() => listAssetNotes(), [] as NoteDto[], {
		immediate: true,
		resetOnExecute: false,
		onError: (error) => {
			toast.add({
				title: t('assets.notes.toast.loadFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
		},
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

	function openEditor(note: NoteDto) {
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
			linkedProjectId: null,
			linkedTaskId: null,
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
			toast.add({ title: validation.message, color: 'error' })
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
				toast.add({ title: t('assets.common.toast.savedTitle'), color: 'success' })
			} else {
				await createAssetNote(payload)
				toast.add({ title: t('assets.common.toast.createdTitle'), color: 'success' })
			}
			await refresh()
			closeEditor()
		} catch (error) {
			toast.add({
				title: t('assets.common.toast.saveFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
		}
	}

	async function onDelete(id: string) {
		try {
			await deleteAssetNote(id)
			toast.add({ title: t('assets.common.toast.deletedTitle'), color: 'success' })
			if (selectedNote.value?.id === id) {
				closeEditor()
			}
			await refresh()
		} catch (error) {
			toast.add({
				title: t('assets.common.toast.deleteFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
		}
	}

	return {
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
	}
}
