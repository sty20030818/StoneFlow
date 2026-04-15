import { refDebounced, useAsyncState } from '@vueuse/core'
import { computed, onUnmounted, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

import { useErrorHandler } from '@/shared/composables/base/useErrorHandler'
import { useLoadErrorFeedback } from '@/shared/composables/base/useLoadErrorFeedback'
import { validateWithZod } from '@/shared/composables/base/zod'
import { snippetSubmitSchema } from '@/shared/composables/domain/validation/forms'
import type { AssetSnippet } from '../model'
import { createAssetSnippet, deleteAssetSnippet, updateAssetSnippet } from '../mutations'
import { listAssetSnippets } from '../queries'
import { useAssetClipboardFeedback } from '../../shared/logic'
import { useAssetsSnippetsHeaderBridge, type SnippetFilterOption } from './useAssetsSnippetsHeaderBridge'

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

const COMMON_EDITOR_LANGUAGES = [
	'plaintext',
	'typescript',
	'javascript',
	'tsx',
	'jsx',
	'json',
	'html',
	'css',
	'scss',
	'vue',
	'python',
	'rust',
	'sql',
] as const

const EDITOR_LANGUAGE_LABELS: Record<string, string> = {
	plaintext: 'Plaintext',
	typescript: 'TypeScript',
	javascript: 'JavaScript',
	tsx: 'TSX',
	jsx: 'JSX',
	json: 'JSON',
	html: 'HTML',
	css: 'CSS',
	scss: 'SCSS',
	vue: 'Vue',
	python: 'Python',
	rust: 'Rust',
	sql: 'SQL',
}

function normalizeEditorLanguageValue(language: string) {
	const trimmed = language.trim()
	if (!trimmed) return ''

	const normalized = trimmed.toLowerCase()
	if (normalized in EDITOR_LANGUAGE_LABELS) {
		return normalized
	}

	return trimmed
}

export function useAssetsSnippetsPage() {
	const { t, locale } = useI18n({ useScope: 'global' })
	const { handleApiError, handleSuccess, handleValidationError } = useErrorHandler()
	const { copyWithFeedback } = useAssetClipboardFeedback()
	const {
		searchKeyword,
		selectedLanguage,
		selectedTag,
		selectedFavoriteFilter,
		selectedSort,
		hasActiveFilters,
		resetSnippetHeaderFilters,
		setSnippetHeaderOptions,
		bindSnippetCreateAction,
	} = useAssetsSnippetsHeaderBridge()

	const selectedSnippet = ref<AssetSnippet | null>(null)
	const editOpen = ref(false)
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

	const editorLanguageOptions = computed<SnippetFilterOption[]>(() => {
		const items = new Map<string, string>()
		for (const language of COMMON_EDITOR_LANGUAGES) {
			const value = normalizeEditorLanguageValue(language)
			items.set(value.toLowerCase(), value)
		}

		for (const snippet of snippets.value) {
			const value = normalizeEditorLanguageValue(snippet.language)
			if (value) {
				items.set(value.toLowerCase(), value)
			}
		}

		return Array.from(items.values())
			.map((language) => ({
				label: languageLabel(language),
				value: language,
			}))
			.sort((left, right) => left.label.localeCompare(right.label))
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
		{ label: t('assets.snippets.filters.sortTitle'), value: 'title_asc' },
		{ label: t('assets.snippets.filters.sortCreated'), value: 'created_desc' },
		{ label: t('assets.snippets.filters.sortUpdated'), value: 'updated_desc' },
	])

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
		resetSnippetHeaderFilters()
	}

	function openEditor(snippet: AssetSnippet) {
		selectedSnippet.value = snippet
		editForm.value = {
			title: snippet.title,
			language: normalizeEditorLanguageValue(snippet.language) || 'typescript',
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
		const normalized = normalizeEditorLanguageValue(language)
		if (!normalized) {
			return t('assets.snippets.labels.plaintext')
		}

		return EDITOR_LANGUAGE_LABELS[normalized.toLowerCase()] ?? normalized
	}

	function formatSnippetDate(timestamp: number) {
		return new Intl.DateTimeFormat(locale.value, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		}).format(timestamp)
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
				language: normalizeEditorLanguageValue(editForm.value.language) || 'plaintext',
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

	watchEffect(() => {
		setSnippetHeaderOptions({
			languageOptions: languageOptions.value,
			tagOptions: tagOptions.value,
			favoriteOptions: favoriteOptions.value,
			sortOptions: sortOptions.value,
		})
	})

	const cleanupCreateAction = bindSnippetCreateAction(onCreateNew)

	onUnmounted(() => {
		cleanupCreateAction()
	})

	return {
		t,
		loading,
		loadErrorMessage,
		showLoadErrorState,
		snippets,
		selectedSnippet,
		editOpen,
		editForm,
		tagsInput,
		editorLanguageOptions,
		hasActiveFilters,
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
		languageLabel,
	}
}
