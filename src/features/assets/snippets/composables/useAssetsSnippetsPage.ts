import { refDebounced, useAsyncState } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useErrorHandler } from '@/composables/base/useErrorHandler'
import { useLoadErrorFeedback } from '@/composables/base/useLoadErrorFeedback'
import { snippetSubmitSchema } from '@/composables/domain/validation/forms'
import { validateWithZod } from '@/composables/base/zod'

import type { AssetSnippet } from '../model'
import { createAssetSnippet, deleteAssetSnippet, updateAssetSnippet } from '../mutations'
import { listAssetSnippets } from '../queries'

export function useAssetsSnippetsPage() {
	const { t } = useI18n({ useScope: 'global' })
	const { handleApiError, handleSuccess, handleValidationError } = useErrorHandler()

	const selectedSnippet = ref<AssetSnippet | null>(null)
	const editOpen = ref(false)
	const selectedFolder = ref<string | null>(null)
	const searchKeyword = ref('')
	const debouncedSearchKeyword = refDebounced(searchKeyword, 180)
	const loadError = ref<unknown | null>(null)

	const {
		state: snippets,
		isLoading: loading,
		execute: executeRefresh,
	} = useAsyncState(() => listAssetSnippets(), [] as AssetSnippet[], {
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
		hasData: computed(() => snippets.value.length > 0),
		loading,
		toastTitle: computed(() => t('assets.snippets.toast.loadFailedTitle')),
	})

	const editForm = ref({
		title: '',
		language: 'plaintext',
		content: '',
		folder: '',
		tags: [] as string[],
	})
	const tagsInput = ref('')

	const folders = computed(() => {
		const set = new Set<string>()
		for (const snippet of snippets.value) {
			if (snippet.folder) set.add(snippet.folder)
		}
		return Array.from(set).sort()
	})

	const filteredSnippets = computed(() => {
		let result = snippets.value

		if (selectedFolder.value !== null) {
			result = result.filter((snippet) => snippet.folder === selectedFolder.value)
		}

		if (debouncedSearchKeyword.value.trim()) {
			const keyword = debouncedSearchKeyword.value.trim().toLowerCase()
			result = result.filter((snippet) => {
				if (snippet.title.toLowerCase().includes(keyword)) return true
				if (snippet.content.toLowerCase().includes(keyword)) return true
				if (snippet.tags.some((tag) => tag.toLowerCase().includes(keyword))) return true
				return false
			})
		}

		return result.sort((a, b) => b.updatedAt - a.updatedAt)
	})

	function openEditor(snippet: AssetSnippet) {
		selectedSnippet.value = snippet
		editForm.value = {
			title: snippet.title,
			language: snippet.language,
			content: snippet.content,
			folder: snippet.folder ?? '',
			tags: [...snippet.tags],
		}
		tagsInput.value = snippet.tags.join(', ')
		editOpen.value = true
	}

	function onCreateNew() {
		openEditor({
			id: '',
			title: '',
			language: 'plaintext',
			content: '',
			description: null,
			folder: null,
			tags: [],
			favorite: false,
			linkedTaskId: null,
			linkedProjectId: null,
			syncState: 'local',
			createdAt: Date.now(),
			updatedAt: Date.now(),
		})
	}

	function closeEditor() {
		editOpen.value = false
		selectedSnippet.value = null
	}

	function onTagsBlur() {
		editForm.value.tags = tagsInput.value
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean)
	}

	async function refresh() {
		await executeRefresh(0)
	}

	async function onSave() {
		if (!selectedSnippet.value) return
		const validation = validateWithZod(snippetSubmitSchema, { title: editForm.value.title })
		if (!validation.ok) {
			handleValidationError(validation.message)
			return
		}

		try {
			onTagsBlur()
			const payload = {
				...editForm.value,
				folder: editForm.value.folder.trim() || null,
			}
			if (selectedSnippet.value.id) {
				await updateAssetSnippet(selectedSnippet.value.id, payload)
				handleSuccess(t('assets.common.toast.savedTitle'))
			} else {
				await createAssetSnippet(payload)
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
			await deleteAssetSnippet(id)
			handleSuccess(t('assets.common.toast.deletedTitle'))
			if (selectedSnippet.value?.id === id) {
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
	}
}
