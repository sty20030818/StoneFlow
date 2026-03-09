import { useAsyncState } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { validateWithZod } from '@/composables/base/zod'
import { diarySubmitSchema } from '@/composables/domain/validation/forms'
import { resolveErrorMessage } from '@/utils/error-message'
import { formatDate } from '@/utils/time'

import type { AssetDiaryEntry, AssetDiaryTask, DiaryGroupedEntry } from '../model'
import { createAssetDiaryEntry, deleteAssetDiaryEntry, updateAssetDiaryEntry } from '../mutations'
import { listAssetDiaryDoneTasks, listAssetDiaryEntries } from '../queries'

export function useAssetsDiaryPage() {
	const toast = useToast()
	const { t, locale } = useI18n({ useScope: 'global' })
	const router = useRouter()

	const entries = ref<AssetDiaryEntry[]>([])
	const tasks = ref<AssetDiaryTask[]>([])
	const selectedEntry = ref<AssetDiaryEntry | null>(null)
	const editOpen = ref(false)
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
				entries.value = nextEntries
				tasks.value = nextTasks
			},
			onError: (error) => {
				toast.add({
					title: t('assets.diary.toast.loadFailedTitle'),
					description: resolveErrorMessage(error, t),
					color: 'error',
				})
			},
		},
	)

	const editForm = ref({
		date: new Date().toISOString().split('T')[0],
		title: '',
		content: '',
		linkedTaskIds: [] as string[],
		linkedProjectId: '',
	})

	const groupedEntries = computed<DiaryGroupedEntry[]>(() => {
		const byDate = new Map<string, AssetDiaryEntry[]>()

		for (const entry of entries.value) {
			const entryList = byDate.get(entry.date) ?? []
			entryList.push(entry)
			byDate.set(entry.date, entryList)
		}

		const result: DiaryGroupedEntry[] = []
		for (const [date, entriesList] of byDate.entries()) {
			const dateLabel = formatDate(date, {
				locale: locale.value,
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				weekday: 'long',
			})

			const dayTasks = tasks.value.filter((task) => {
				if (!task.completedAt) return false
				const taskDate = new Date(task.completedAt).toISOString().split('T')[0]
				return taskDate === date
			})

			result.push({
				date,
				dateLabel,
				entries: entriesList.sort((a, b) => b.createdAt - a.createdAt),
				tasks: dayTasks,
			})
		}

		return result.sort((a, b) => b.date.localeCompare(a.date))
	})

	function selectEntry(entry: AssetDiaryEntry) {
		selectedEntry.value = entry
		editForm.value = {
			date: entry.date,
			title: entry.title,
			content: entry.content,
			linkedTaskIds: [...entry.linkedTaskIds],
			linkedProjectId: entry.linkedProjectId ?? '',
		}
		editOpen.value = true
	}

	function onCreateNew() {
		selectedEntry.value = null
		editForm.value = {
			date: new Date().toISOString().split('T')[0],
			title: '',
			content: '',
			linkedTaskIds: [],
			linkedProjectId: '',
		}
		editOpen.value = true
	}

	function closeEditor() {
		editOpen.value = false
	}

	async function onSave() {
		const validation = validateWithZod(diarySubmitSchema, { title: editForm.value.title })
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}

		try {
			const payload = {
				...editForm.value,
				linkedProjectId: editForm.value.linkedProjectId.trim() || null,
			}
			if (selectedEntry.value) {
				await updateAssetDiaryEntry(selectedEntry.value.id, payload)
				toast.add({ title: t('assets.common.toast.savedTitle'), color: 'success' })
			} else {
				await createAssetDiaryEntry(payload)
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

	async function onDelete(entryId: string) {
		try {
			await deleteAssetDiaryEntry(entryId)
			toast.add({ title: t('assets.common.toast.deletedTitle'), color: 'success' })
			await refresh()
		} catch (error) {
			toast.add({
				title: t('assets.common.toast.deleteFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
		}
	}

	function goToFinishList() {
		router.push({ path: '/finish-list' })
	}

	async function refresh() {
		await executeRefresh(0)
	}

	return {
		t,
		loading,
		selectedEntry,
		editOpen,
		editForm,
		groupedEntries,
		selectEntry,
		onCreateNew,
		closeEditor,
		onSave,
		onDelete,
		goToFinishList,
	}
}
