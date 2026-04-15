import { refDebounced, useAsyncState, watchDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useErrorHandler } from '@/shared/composables/base/useErrorHandler'
import { useLoadErrorFeedback } from '@/shared/composables/base/useLoadErrorFeedback'
import { validateWithZod } from '@/shared/composables/base/zod'
import { noteSubmitSchema } from '@/shared/composables/domain/validation/forms'
import { useTaskInspectorStore } from '@/features/inspector'
import { getWorkspaceTaskByIdSnapshot } from '@/features/workspace'

import type { AssetNote } from '../model'
import { createAssetNote, deleteAssetNote, updateAssetNote } from '../mutations'
import { listAssetNotes } from '../queries'

type NoteFilterOption = {
	label: string
	value: string
}

type NoteFavoriteFilter = 'all' | 'favorites'
type NoteWorkspaceMode = 'edit' | 'preview'
type SaveReason = 'manual' | 'autosave'

function createEmptyNote(): AssetNote {
	const now = Date.now()
	return {
		id: '',
		title: '',
		content: '',
		excerpt: null,
		tags: [],
		favorite: false,
		linkedProjectId: null,
		linkedTaskId: null,
		syncState: 'local',
		createdAt: now,
		updatedAt: now,
	}
}

export function useAssetsNotesPage() {
	const router = useRouter()
	const taskInspectorStore = useTaskInspectorStore()
	const { t, locale } = useI18n({ useScope: 'global' })
	const { handleApiError, handleSuccess, handleValidationError } = useErrorHandler()

	const selectedNote = ref<AssetNote | null>(null)
	const searchKeyword = ref('')
	const debouncedSearchKeyword = refDebounced(searchKeyword, 180)
	const selectedTag = ref('all')
	const selectedFavoriteFilter = ref<NoteFavoriteFilter>('all')
	const workspaceMode = ref<NoteWorkspaceMode>('edit')
	const loadError = ref<unknown | null>(null)
	const isHydratingForm = ref(false)
	const isSaving = ref(false)
	const lastSavedSignature = ref('')

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
		tags: [] as string[],
		favorite: false,
		linkedProjectId: '',
		linkedTaskId: '',
	})
	const tagsInput = ref('')

	const tagOptions = computed<NoteFilterOption[]>(() => {
		const items = new Set<string>()
		for (const note of notes.value) {
			for (const tag of note.tags) {
				if (tag.trim()) {
					items.add(tag.trim())
				}
			}
		}

		return [
			{ label: t('assets.notes.filters.allTags'), value: 'all' },
			...Array.from(items)
				.sort((left, right) => left.localeCompare(right))
				.map((tag) => ({
					label: `#${tag}`,
					value: tag,
				})),
		]
	})

	const favoriteOptions = computed<NoteFilterOption[]>(() => [
		{ label: t('assets.notes.filters.favoriteAll'), value: 'all' },
		{ label: t('assets.notes.filters.favoriteOnly'), value: 'favorites' },
	])

	const filteredNotes = computed(() => {
		const keyword = debouncedSearchKeyword.value.trim().toLowerCase()

		return [...notes.value]
			.filter((note) => {
				if (selectedTag.value !== 'all' && !note.tags.includes(selectedTag.value)) {
					return false
				}

				if (selectedFavoriteFilter.value === 'favorites' && !note.favorite) {
					return false
				}

				if (!keyword) return true

				return [
					note.title,
					note.content,
					note.excerpt ?? '',
					note.tags.join(' '),
					note.linkedProjectId ?? '',
					note.linkedTaskId ?? '',
				].some((field) => field.toLowerCase().includes(keyword))
			})
			.sort((left, right) => right.updatedAt - left.updatedAt)
	})

	const hasActiveFilters = computed(() => {
		return (
			selectedTag.value !== 'all' ||
			selectedFavoriteFilter.value !== 'all' ||
			debouncedSearchKeyword.value.trim().length > 0
		)
	})

	const favoriteCount = computed(() => notes.value.filter((note) => note.favorite).length)

	const saveIndicator = computed(() => {
		if (isSaving.value) return t('assets.notes.status.saving')
		if (!selectedNote.value) return t('assets.notes.status.idle')
		if (!editForm.value.title.trim()) return t('assets.notes.status.waitingTitle')
		const currentSignature = buildSignature(buildPayload())
		if (currentSignature !== lastSavedSignature.value) return t('assets.notes.status.pending')
		return t('assets.notes.status.saved')
	})

	function formatNoteDate(timestamp: number) {
		return new Intl.DateTimeFormat(locale.value, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(timestamp)
	}

	function notePreview(content: string) {
		return content.split('\n').filter(Boolean).slice(0, 3).join(' ').trim()
	}

	function buildExcerpt(content: string) {
		const excerpt = content.replace(/\s+/g, ' ').trim().slice(0, 140)

		return excerpt || null
	}

	function onTagsBlur() {
		editForm.value.tags = tagsInput.value
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean)
	}

	function buildPayload() {
		onTagsBlur()
		return {
			title: editForm.value.title.trim(),
			content: editForm.value.content,
			excerpt: buildExcerpt(editForm.value.content),
			tags: [...editForm.value.tags],
			favorite: editForm.value.favorite,
			linkedProjectId: editForm.value.linkedProjectId.trim() || null,
			linkedTaskId: editForm.value.linkedTaskId.trim() || null,
		}
	}

	function buildSignature(payload: ReturnType<typeof buildPayload>) {
		return JSON.stringify(payload)
	}

	function hydrateForm(note: AssetNote) {
		isHydratingForm.value = true
		selectedNote.value = note
		editForm.value = {
			title: note.title,
			content: note.content,
			tags: [...note.tags],
			favorite: note.favorite,
			linkedProjectId: note.linkedProjectId ?? '',
			linkedTaskId: note.linkedTaskId ?? '',
		}
		tagsInput.value = note.tags.join(', ')
		lastSavedSignature.value = buildSignature({
			title: note.title,
			content: note.content,
			excerpt: note.excerpt ?? buildExcerpt(note.content),
			tags: [...note.tags],
			favorite: note.favorite,
			linkedProjectId: note.linkedProjectId ?? null,
			linkedTaskId: note.linkedTaskId ?? null,
		})
		queueMicrotask(() => {
			isHydratingForm.value = false
		})
	}

	function upsertLocalNote(note: AssetNote) {
		const next = [...notes.value]
		const targetIndex = next.findIndex((item) => item.id === note.id)

		if (targetIndex >= 0) {
			next.splice(targetIndex, 1, note)
		} else {
			next.unshift(note)
		}

		notes.value = next.sort((left, right) => right.updatedAt - left.updatedAt)
	}

	function removeLocalNote(id: string) {
		notes.value = notes.value.filter((note) => note.id !== id)
	}

	function openEditor(note: AssetNote) {
		workspaceMode.value = 'edit'
		hydrateForm(note)
	}

	function onCreateNew() {
		openEditor(createEmptyNote())
	}

	function resetFilters() {
		searchKeyword.value = ''
		selectedTag.value = 'all'
		selectedFavoriteFilter.value = 'all'
	}

	async function refresh() {
		await executeRefresh(0)
	}

	async function persistCurrentNote(reason: SaveReason) {
		if (!selectedNote.value) return false

		const payload = buildPayload()
		const signature = buildSignature(payload)

		if (signature === lastSavedSignature.value) {
			return true
		}

		const validation = validateWithZod(noteSubmitSchema, { title: payload.title })
		if (!validation.ok) {
			if (reason === 'manual') {
				handleValidationError(validation.message)
			}
			return false
		}

		try {
			isSaving.value = true

			if (selectedNote.value.id) {
				await updateAssetNote(selectedNote.value.id, payload)
				const nextNote: AssetNote = {
					...selectedNote.value,
					...payload,
					updatedAt: Date.now(),
				}
				upsertLocalNote(nextNote)
				selectedNote.value = nextNote
			} else {
				const created = await createAssetNote(payload)
				upsertLocalNote(created)
				selectedNote.value = created
			}

			lastSavedSignature.value = signature

			if (reason === 'manual') {
				handleSuccess(t('assets.common.toast.savedTitle'))
			}

			return true
		} catch (error) {
			if (reason === 'manual') {
				handleApiError(error, {
					title: t('assets.common.toast.saveFailedTitle'),
				})
			}
			return false
		} finally {
			isSaving.value = false
		}
	}

	async function onSave() {
		await persistCurrentNote('manual')
	}

	async function onDelete(id: string) {
		try {
			await deleteAssetNote(id)
			handleSuccess(t('assets.common.toast.deletedTitle'))
			removeLocalNote(id)

			if (selectedNote.value?.id === id) {
				const fallback = filteredNotes.value.find((note) => note.id !== id) ?? notes.value[0] ?? null
				if (fallback) {
					hydrateForm(fallback)
				} else {
					selectedNote.value = null
					editForm.value = {
						title: '',
						content: '',
						tags: [],
						favorite: false,
						linkedProjectId: '',
						linkedTaskId: '',
					}
					tagsInput.value = ''
					lastSavedSignature.value = ''
				}
			}
		} catch (error) {
			handleApiError(error, {
				title: t('assets.common.toast.deleteFailedTitle'),
			})
		}
	}

	async function onToggleFavorite(note: AssetNote) {
		try {
			await updateAssetNote(note.id, {
				favorite: !note.favorite,
			})

			const nextNote: AssetNote = {
				...note,
				favorite: !note.favorite,
				updatedAt: Date.now(),
			}

			upsertLocalNote(nextNote)
			if (selectedNote.value?.id === note.id) {
				hydrateForm(nextNote)
			}

			handleSuccess(
				note.favorite ? t('assets.notes.toast.favoriteRemovedTitle') : t('assets.notes.toast.favoriteAddedTitle'),
			)
		} catch (error) {
			handleApiError(error, {
				title: t('assets.common.toast.saveFailedTitle'),
			})
		}
	}

	async function openLinkedProject() {
		const projectId = editForm.value.linkedProjectId.trim()
		if (!projectId) return
		await router.push({
			path: '/all-tasks',
			query: { project: projectId },
		})
	}

	async function openLinkedTask() {
		const taskId = editForm.value.linkedTaskId.trim()
		if (!taskId) return

		const task = getWorkspaceTaskByIdSnapshot(taskId)
		await router.push({ path: '/all-tasks' })

		if (task) {
			taskInspectorStore.open(task)
			return
		}

		handleValidationError(t('assets.notes.toast.linkedTaskUnavailable'))
	}

	watch(
		notes,
		(currentNotes) => {
			if (!selectedNote.value && currentNotes.length > 0) {
				hydrateForm(currentNotes[0])
				return
			}

			if (selectedNote.value?.id) {
				const fresh = currentNotes.find((note) => note.id === selectedNote.value?.id)
				if (fresh && !isSaving.value) {
					hydrateForm(fresh)
				}
			}
		},
		{ immediate: true },
	)

	watch(filteredNotes, (currentNotes) => {
		if (!selectedNote.value?.id) return
		if (currentNotes.some((note) => note.id === selectedNote.value?.id)) return
		const fallback = currentNotes[0] ?? null
		if (fallback) {
			hydrateForm(fallback)
		}
	})

	watchDebounced(
		() => buildSignature(buildPayload()),
		async () => {
			if (isHydratingForm.value || !selectedNote.value) return
			await persistCurrentNote('autosave')
		},
		{
			debounce: 700,
			maxWait: 1500,
		},
	)

	return {
		t,
		loading,
		loadErrorMessage,
		showLoadErrorState,
		selectedNote,
		searchKeyword,
		selectedTag,
		selectedFavoriteFilter,
		workspaceMode,
		editForm,
		tagsInput,
		tagOptions,
		favoriteOptions,
		hasActiveFilters,
		favoriteCount,
		filteredNotes,
		saveIndicator,
		formatNoteDate,
		notePreview,
		onTagsBlur,
		openEditor,
		onCreateNew,
		resetFilters,
		refresh,
		onSave,
		onDelete,
		onToggleFavorite,
		openLinkedProject,
		openLinkedTask,
	}
}
