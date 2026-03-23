import { refDebounced, useAsyncState } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useErrorHandler } from '@/composables/base/useErrorHandler'
import { useLoadErrorFeedback } from '@/composables/base/useLoadErrorFeedback'
import { validateWithZod } from '@/composables/base/zod'
import { snippetSubmitSchema } from '@/composables/domain/validation/forms'
import type { AssetSnippet } from '../model'
import { createAssetSnippet, deleteAssetSnippet, updateAssetSnippet } from '../mutations'
import { listAssetSnippets } from '../queries'
import { useAssetClipboardFeedback } from '../../shared/composables'

type SnippetFilterOption = {
	label: string
	value: string
}

type SnippetFavoriteFilter = 'all' | 'favorites' | 'unstarred'
type SnippetSortOption = 'updated_desc' | 'created_desc' | 'title_asc'

function createEmptySnippet(): AssetSnippet {
	const now = Date.now()
	return {
		id: '',
		title: '',
		language: 'typescript',
		content: '',
		description: null,
		folder: null,
		tags: [],
		favorite: false,
		linkedTaskId: null,
		linkedProjectId: null,
		syncState: 'local',
		createdAt: now,
		updatedAt: now,
	}
}

export function useAssetsSnippetsPage() {
	const { t, locale } = useI18n({ useScope: 'global' })
	const { handleApiError, handleSuccess, handleValidationError } = useErrorHandler()
	const { copyWithFeedback } = useAssetClipboardFeedback()

	const selectedSnippet = ref<AssetSnippet | null>(null)
	const editOpen = ref(false)
	const searchKeyword = ref('')
	const debouncedSearchKeyword = refDebounced(searchKeyword, 180)
	const selectedLanguage = ref('all')
	const selectedTag = ref('all')
	const selectedFavoriteFilter = ref<SnippetFavoriteFilter>('all')
	const selectedSort = ref<SnippetSortOption>('updated_desc')
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
		language: 'typescript',
		content: '',
		description: '',
		folder: '',
		tags: [] as string[],
		favorite: false,
	})
	const tagsInput = ref('')

	const languageOptions = computed<SnippetFilterOption[]>(() => {
		const items = new Set<string>()
		for (const snippet of snippets.value) {
			if (snippet.language.trim()) {
				items.add(snippet.language.trim())
			}
		}

		return [
			{ label: t('assets.snippets.filters.allLanguages'), value: 'all' },
			...Array.from(items)
				.sort((left, right) => left.localeCompare(right))
				.map((language) => ({
					label: language,
					value: language,
				})),
		]
	})

	const tagOptions = computed<SnippetFilterOption[]>(() => {
		const items = new Set<string>()
		for (const snippet of snippets.value) {
			for (const tag of snippet.tags) {
				if (tag.trim()) {
					items.add(tag.trim())
				}
			}
		}

		return [
			{ label: t('assets.snippets.filters.allTags'), value: 'all' },
			...Array.from(items)
				.sort((left, right) => left.localeCompare(right))
				.map((tag) => ({
					label: `#${tag}`,
					value: tag,
				})),
		]
	})

	const favoriteOptions = computed<SnippetFilterOption[]>(() => [
		{ label: t('assets.snippets.filters.favoriteAll'), value: 'all' },
		{ label: t('assets.snippets.filters.favoriteOnly'), value: 'favorites' },
		{ label: t('assets.snippets.filters.favoriteOff'), value: 'unstarred' },
	])

	const sortOptions = computed<SnippetFilterOption[]>(() => [
		{ label: t('assets.snippets.filters.sortUpdated'), value: 'updated_desc' },
		{ label: t('assets.snippets.filters.sortCreated'), value: 'created_desc' },
		{ label: t('assets.snippets.filters.sortTitle'), value: 'title_asc' },
	])

	const hasActiveFilters = computed(() => {
		return (
			selectedLanguage.value !== 'all'
			|| selectedTag.value !== 'all'
			|| selectedFavoriteFilter.value !== 'all'
			|| selectedSort.value !== 'updated_desc'
			|| debouncedSearchKeyword.value.trim().length > 0
		)
	})

	const favoriteCount = computed(() => snippets.value.filter((snippet) => snippet.favorite).length)

	const filteredSnippets = computed(() => {
		const keyword = debouncedSearchKeyword.value.trim().toLowerCase()

		return [...snippets.value]
			.filter((snippet) => {
				if (selectedLanguage.value !== 'all' && snippet.language !== selectedLanguage.value) {
					return false
				}

				if (selectedTag.value !== 'all' && !snippet.tags.includes(selectedTag.value)) {
					return false
				}

				if (selectedFavoriteFilter.value === 'favorites' && !snippet.favorite) {
					return false
				}

				if (selectedFavoriteFilter.value === 'unstarred' && snippet.favorite) {
					return false
				}

				if (!keyword) return true

				return [
					snippet.title,
					snippet.language,
					snippet.description ?? '',
					snippet.content,
					snippet.folder ?? '',
					snippet.tags.join(' '),
				].some((field) => field.toLowerCase().includes(keyword))
			})
			.sort((left, right) => {
				if (selectedSort.value === 'created_desc') {
					return right.createdAt - left.createdAt
				}

				if (selectedSort.value === 'title_asc') {
					return left.title.localeCompare(right.title)
				}

				return right.updatedAt - left.updatedAt
			})
	})

	const currentLanguageLabel = computed(() => {
		return languageLabel(editForm.value.language)
	})

	function resetFilters() {
		searchKeyword.value = ''
		selectedLanguage.value = 'all'
		selectedTag.value = 'all'
		selectedFavoriteFilter.value = 'all'
		selectedSort.value = 'updated_desc'
	}

	function openEditor(snippet: AssetSnippet) {
		selectedSnippet.value = snippet
		editForm.value = {
			title: snippet.title,
			language: snippet.language || 'typescript',
			content: snippet.content,
			description: snippet.description ?? '',
			folder: snippet.folder ?? '',
			tags: [...snippet.tags],
			favorite: snippet.favorite,
		}
		tagsInput.value = snippet.tags.join(', ')
		editOpen.value = true
	}

	function onCreateNew() {
		openEditor(createEmptySnippet())
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

	function languageLabel(language: string) {
		const normalized = language.trim()
		return normalized || t('assets.snippets.labels.plaintext')
	}

	function formatSnippetDate(timestamp: number) {
		return new Intl.DateTimeFormat(locale.value, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		}).format(timestamp)
	}

	function previewContent(content: string) {
		return content
			.split('\n')
			.slice(0, 8)
			.join('\n')
			.trim()
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
				title: editForm.value.title.trim(),
				language: editForm.value.language.trim() || 'plaintext',
				content: editForm.value.content,
				description: editForm.value.description.trim() || null,
				folder: editForm.value.folder.trim() || null,
				tags: [...editForm.value.tags],
				favorite: editForm.value.favorite,
				linkedTaskId: selectedSnippet.value.linkedTaskId ?? null,
				linkedProjectId: selectedSnippet.value.linkedProjectId ?? null,
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

	async function onToggleFavorite(snippet: AssetSnippet) {
		try {
			await updateAssetSnippet(snippet.id, {
				favorite: !snippet.favorite,
			})
			handleSuccess(
				snippet.favorite
					? t('assets.snippets.toast.favoriteRemovedTitle')
					: t('assets.snippets.toast.favoriteAddedTitle'),
			)
			await refresh()
		} catch (error) {
			handleApiError(error, {
				title: t('assets.common.toast.saveFailedTitle'),
			})
		}
	}

	async function onCopySnippet(snippet: AssetSnippet) {
		await copyWithFeedback(snippet.content, {
			successTitle: t('assets.snippets.toast.copiedTitle'),
			emptyTitle: t('assets.snippets.toast.emptyCopyTitle'),
			errorTitle: t('assets.snippets.toast.copyFailedTitle'),
		})
	}

	async function onCopyDraft() {
		await copyWithFeedback(editForm.value.content, {
			successTitle: t('assets.snippets.toast.copiedTitle'),
			emptyTitle: t('assets.snippets.toast.emptyCopyTitle'),
			errorTitle: t('assets.snippets.toast.copyFailedTitle'),
		})
	}

	return {
		t,
		loading,
		loadErrorMessage,
		showLoadErrorState,
		snippets,
		selectedSnippet,
		editOpen,
		searchKeyword,
		selectedLanguage,
		selectedTag,
		selectedFavoriteFilter,
		selectedSort,
		editForm,
		tagsInput,
		languageOptions,
		tagOptions,
		favoriteOptions,
		sortOptions,
		hasActiveFilters,
		favoriteCount,
		filteredSnippets,
		currentLanguageLabel,
		resetFilters,
		refresh,
		openEditor,
		onCreateNew,
		closeEditor,
		onTagsBlur,
		onSave,
		onDelete,
		onToggleFavorite,
		onCopySnippet,
		onCopyDraft,
		formatSnippetDate,
		previewContent,
		languageLabel,
	}
}
