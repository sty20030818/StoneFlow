import { useAsyncState } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useErrorHandler } from '@/shared/composables/base/useErrorHandler'
import { useLoadErrorFeedback } from '@/shared/composables/base/useLoadErrorFeedback'
import { validateWithZod } from '@/shared/composables/base/zod'
import { diarySubmitSchema } from '@/shared/composables/domain/validation/forms'

import type { AssetDiaryEntry, AssetDiaryTask } from '../model'
import { createAssetDiaryEntry, deleteAssetDiaryEntry, updateAssetDiaryEntry } from '../mutations'
import { listAssetDiaryDoneTasks, listAssetDiaryEntries } from '../queries'

type DiaryWorkspaceMode = 'edit' | 'preview'

function todayKey() {
	return new Date().toISOString().split('T')[0]
}

function createDiaryTemplate() {
	return [
		'## 今日进展',
		'',
		'- ',
		'',
		'## 遇到的问题',
		'',
		'- ',
		'',
		'## 重要记录',
		'',
		'- ',
		'',
		'## 明日计划',
		'',
		'- ',
	].join('\n')
}

function createEmptyDiaryEntry(): AssetDiaryEntry {
	const now = Date.now()
	return {
		id: '',
		date: todayKey(),
		title: '',
		subtitle: '工作日记',
		content: createDiaryTemplate(),
		tags: [],
		favorite: false,
		linkedTaskIds: [],
		linkedProjectId: null,
		syncState: 'local',
		createdAt: now,
		updatedAt: now,
	}
}

export function useAssetsDiaryPage() {
	const router = useRouter()
	const { t, locale } = useI18n({ useScope: 'global' })
	const { handleApiError, handleSuccess, handleValidationError } = useErrorHandler()

	const entries = ref<AssetDiaryEntry[]>([])
	const tasks = ref<AssetDiaryTask[]>([])
	const selectedEntry = ref<AssetDiaryEntry | null>(null)
	const workspaceMode = ref<DiaryWorkspaceMode>('edit')
	const loadError = ref<unknown | null>(null)

	const { isLoading: loading, execute: executeRefresh } = useAsyncState(
		async () => {
			const [diaryEntries, doneTasks] = await Promise.all([listAssetDiaryEntries(), listAssetDiaryDoneTasks()])
			return {
				entries: diaryEntries,
				tasks: doneTasks.filter((task) => task.doneReason !== 'cancelled'),
			}
		},
		{
			entries: [] as AssetDiaryEntry[],
			tasks: [] as AssetDiaryTask[],
		},
		{
			immediate: true,
			resetOnExecute: false,
			onSuccess: ({ entries: nextEntries, tasks: nextTasks }) => {
				entries.value = [...nextEntries].sort((left, right) => right.date.localeCompare(left.date))
				tasks.value = nextTasks
				loadError.value = null
			},
			onError: (error) => {
				loadError.value = error
			},
		},
	)

	const editForm = ref({
		date: todayKey(),
		subtitle: '工作日记',
		content: createDiaryTemplate(),
		linkedProjectId: '',
		favorite: false,
	})

	const diaryEntries = computed(() => {
		return [...entries.value].sort((left, right) => {
			if (left.date === right.date) {
				return right.updatedAt - left.updatedAt
			}
			return right.date.localeCompare(left.date)
		})
	})

	const selectedDateTasks = computed(() => {
		return tasks.value.filter((task) => {
			if (!task.completedAt) return false
			const taskDate = new Date(task.completedAt).toISOString().split('T')[0]
			return taskDate === editForm.value.date
		})
	})

	const selectedDateTaskIds = computed(() => selectedDateTasks.value.map((task) => task.id))

	const selectedDateTitlePrefix = computed(() => {
		const date = editForm.value.date || todayKey()
		const label = new Intl.DateTimeFormat(locale.value, {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			weekday: 'short',
		}).format(new Date(`${date}T12:00:00`))
		return label.replace(/\//g, '-').replace(/,\s*/g, '｜')
	})

	const composedTitle = computed(() => {
		const subtitle = editForm.value.subtitle.trim()
		return subtitle ? `${selectedDateTitlePrefix.value}｜${subtitle}` : selectedDateTitlePrefix.value
	})

	const currentDiarySummary = computed(() => {
		if (!selectedEntry.value) return t('assets.diary.labels.noSelectionDescription')
		return t('assets.diary.labels.updatedAt', {
			date: formatDiaryDateTime(selectedEntry.value.updatedAt),
		})
	})

	const { loadErrorMessage, showLoadErrorState } = useLoadErrorFeedback({
		error: loadError,
		hasData: computed(() => diaryEntries.value.length > 0),
		loading,
		toastTitle: computed(() => t('assets.diary.toast.loadFailedTitle')),
	})

	function formatDiaryDate(date: string) {
		return new Intl.DateTimeFormat(locale.value, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			weekday: 'long',
		}).format(new Date(`${date}T12:00:00`))
	}

	function formatDiaryDateTime(timestamp: number) {
		return new Intl.DateTimeFormat(locale.value, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(timestamp)
	}

	function entryPreview(content: string) {
		return content
			.split('\n')
			.filter(Boolean)
			.slice(0, 3)
			.join(' ')
			.trim()
	}

	function deriveSubtitle(entry: AssetDiaryEntry) {
		if (entry.subtitle?.trim()) return entry.subtitle
		const parts = entry.title.split('｜')
		return parts[parts.length - 1] ?? ''
	}

	function hydrateForm(entry: AssetDiaryEntry) {
		selectedEntry.value = entry
		editForm.value = {
			date: entry.date,
			subtitle: deriveSubtitle(entry),
			content: entry.content || createDiaryTemplate(),
			linkedProjectId: entry.linkedProjectId ?? '',
			favorite: entry.favorite,
		}
	}

	function upsertLocalEntry(entry: AssetDiaryEntry) {
		const next = [...entries.value]
		const targetIndex = next.findIndex((item) => item.id === entry.id)

		if (targetIndex >= 0) {
			next.splice(targetIndex, 1, entry)
		} else {
			next.unshift(entry)
		}

		entries.value = next.sort((left, right) => {
			if (left.date === right.date) {
				return right.updatedAt - left.updatedAt
			}
			return right.date.localeCompare(left.date)
		})
	}

	function selectEntry(entry: AssetDiaryEntry) {
		workspaceMode.value = 'edit'
		hydrateForm(entry)
	}

	function onCreateNew() {
		workspaceMode.value = 'edit'
		const nextEntry = createEmptyDiaryEntry()
		nextEntry.linkedTaskIds = selectedDateTaskIds.value
		hydrateForm(nextEntry)
	}

	function onCreateToday() {
		workspaceMode.value = 'edit'
		const existingToday = diaryEntries.value.find((entry) => entry.date === todayKey())
		if (existingToday) {
			hydrateForm(existingToday)
			return
		}

		const nextEntry = createEmptyDiaryEntry()
		hydrateForm(nextEntry)
	}

	async function onSave() {
		const title = composedTitle.value
		const validation = validateWithZod(diarySubmitSchema, { title })
		if (!validation.ok) {
			handleValidationError(validation.message)
			return
		}

		try {
			const payload = {
				date: editForm.value.date,
				title,
				subtitle: editForm.value.subtitle.trim() || null,
				content: editForm.value.content,
				favorite: editForm.value.favorite,
				linkedTaskIds: selectedDateTaskIds.value,
				linkedProjectId: editForm.value.linkedProjectId.trim() || null,
			}

			if (selectedEntry.value?.id) {
				await updateAssetDiaryEntry(selectedEntry.value.id, payload)
				const nextEntry: AssetDiaryEntry = {
					...selectedEntry.value,
					...payload,
					updatedAt: Date.now(),
				}
				upsertLocalEntry(nextEntry)
				selectedEntry.value = nextEntry
				handleSuccess(t('assets.common.toast.savedTitle'))
			} else {
				const created = await createAssetDiaryEntry(payload)
				upsertLocalEntry(created)
				selectedEntry.value = created
				handleSuccess(t('assets.common.toast.createdTitle'))
			}
		} catch (error) {
			handleApiError(error, {
				title: t('assets.common.toast.saveFailedTitle'),
			})
		}
	}

	async function onDelete(entryId: string) {
		try {
			await deleteAssetDiaryEntry(entryId)
			handleSuccess(t('assets.common.toast.deletedTitle'))
			entries.value = entries.value.filter((entry) => entry.id !== entryId)

			if (selectedEntry.value?.id === entryId) {
				const fallback = diaryEntries.value.find((entry) => entry.id !== entryId) ?? null
				if (fallback) {
					hydrateForm(fallback)
				} else {
					selectedEntry.value = null
					editForm.value = {
						date: todayKey(),
						subtitle: '工作日记',
						content: createDiaryTemplate(),
						linkedProjectId: '',
						favorite: false,
					}
				}
			}
		} catch (error) {
			handleApiError(error, {
				title: t('assets.common.toast.deleteFailedTitle'),
			})
		}
	}

	function goToFinishList() {
		void router.push({ path: '/finish-list' })
	}

	function goToWorkspace() {
		void router.push({ path: '/all-tasks' })
	}

	async function refresh() {
		await executeRefresh(0)
	}

	watch(
		diaryEntries,
		(currentEntries) => {
			if (!selectedEntry.value && currentEntries.length > 0) {
				hydrateForm(currentEntries[0])
			}
		},
		{ immediate: true },
	)

	watch(
		() => editForm.value.date,
		() => {
			if (!selectedEntry.value?.id) {
				editForm.value.content = editForm.value.content || createDiaryTemplate()
			}
		},
	)

	return {
		t,
		loading,
		loadErrorMessage,
		showLoadErrorState,
		selectedEntry,
		workspaceMode,
		editForm,
		diaryEntries,
		selectedDateTasks,
		selectedDateTitlePrefix,
		composedTitle,
		currentDiarySummary,
		formatDiaryDate,
		formatDiaryDateTime,
		entryPreview,
		refresh,
		selectEntry,
		onCreateNew,
		onCreateToday,
		onSave,
		onDelete,
		goToFinishList,
		goToWorkspace,
	}
}
