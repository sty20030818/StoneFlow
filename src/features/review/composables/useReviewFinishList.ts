import { refDebounced, useAsyncState } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { getUnknownProjectLabel } from '@/config/project'
import { SPACE_DISPLAY, SPACE_IDS } from '@/config/space'
import {
	getWorkspaceProjectsSnapshot,
	refreshWorkspaceProjectsQuery,
	type WorkspaceProject,
} from '@/features/workspace'
import { resolveErrorMessage } from '@/utils/error-message'
import { formatDate as formatDateByLocale, formatTimeOfDay } from '@/utils/time'

import type { WorkspaceTask } from '../model'
import { listReviewDoneTasks } from '../queries'

type ProjectGroup = {
	groupKey: string
	projectId: string
	projectName: string
	spaceId: string
	spaceLabel: string
	tasks: WorkspaceTask[]
	medianLead: string
}

export function useReviewFinishList() {
	const toast = useToast()
	const { t, locale } = useI18n({ useScope: 'global' })
	const projectsBySpace = ref<Record<string, WorkspaceProject[]>>({})

	function syncProjectsSnapshot(spaceId: string) {
		projectsBySpace.value = {
			...projectsBySpace.value,
			[spaceId]: getWorkspaceProjectsSnapshot(spaceId),
		}
	}

	function getProjectsOfSpace(spaceId: string) {
		return projectsBySpace.value[spaceId] ?? []
	}

	const { state: tasks, isLoading: loading } = useAsyncState(() => listReviewDoneTasks(), [] as WorkspaceTask[], {
		immediate: true,
		resetOnExecute: false,
		onError: (error) => {
			toast.add({
				title: t('review.finishList.toast.loadFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
		},
	})

	const spaceFilter = ref<string>('all')
	const projectFilter = ref<string>('all')
	const dateRange = ref<string>('this-week')
	const tagKeyword = ref('')
	const debouncedTagKeyword = refDebounced(tagKeyword, 180)

	const reflectionOpen = ref(false)
	const reflectionTask = ref<WorkspaceTask | null>(null)
	const reflectionText = ref('')

	const spaceOptions = computed(() => [
		{ label: t('review.filters.allSpaces'), value: 'all' },
		...SPACE_IDS.map((id) => ({ label: SPACE_DISPLAY[id].label, value: id })),
	])

	const dateRangeOptions = computed(() => [
		{ label: t('review.filters.thisWeek'), value: 'this-week' },
		{ label: t('review.filters.thisMonth'), value: 'this-month' },
		{ label: t('review.filters.allTime'), value: 'all' },
	])

	function formatDate(ts: number): string {
		return formatDateByLocale(ts, {
			locale: locale.value,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		})
	}

	function formatDateTime(ts: number): string {
		const date = formatDate(ts)
		const time = formatTimeOfDay(ts, { locale: locale.value })
		return `${date} ${time}`
	}

	function formatDuration(ms: number): string {
		if (!Number.isFinite(ms) || ms <= 0) return '-'
		const totalMinutes = Math.floor(ms / 60000)
		const h = Math.floor(totalMinutes / 60)
		const m = totalMinutes % 60
		if (h <= 0) return `${m}m`
		if (m <= 0) return `${h}h`
		return `${h}h ${m}m`
	}

	function resolveSpaceLabel(spaceId: string): string {
		return SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY]?.label ?? spaceId
	}

	const projectOptions = computed(() => {
		const all = [{ label: t('review.filters.allProjects'), value: 'all' }]
		const ids = new Set<string>()
		for (const task of tasks.value) {
			if (!task.completedAt || task.doneReason === 'cancelled') continue
			ids.add(task.spaceId)
		}
		const options: Array<{ label: string; value: string }> = []
		for (const sid of Array.from(ids)) {
			const list = getProjectsOfSpace(sid)
			for (const project of list) {
				options.push({
					label: `${resolveSpaceLabel(sid)} / ${project.title}`,
					value: project.id,
				})
			}
		}
		return all.concat(options)
	})

	function isInDateRange(ts: number | null): boolean {
		if (!ts) return false
		const date = new Date(ts)
		const now = new Date()
		if (dateRange.value === 'all') return true
		if (dateRange.value === 'this-week') {
			const diffMs = now.getTime() - date.getTime()
			return diffMs <= 7 * 24 * 60 * 60 * 1000
		}
		if (dateRange.value === 'this-month') {
			return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
		}
		return true
	}

	const filteredTasks = computed(() => {
		return tasks.value.filter((task) => {
			if (!task.completedAt || task.doneReason === 'cancelled') return false
			if (!isInDateRange(task.completedAt)) return false
			if (spaceFilter.value !== 'all' && task.spaceId !== spaceFilter.value) return false
			if (projectFilter.value !== 'all' && task.projectId !== projectFilter.value) return false
			if (debouncedTagKeyword.value.trim()) {
				const keyword = debouncedTagKeyword.value.trim().toLowerCase()
				if (!task.title.toLowerCase().includes(keyword)) return false
			}
			return true
		})
	})

	const projectGroups = computed<ProjectGroup[]>(() => {
		const byProject = new Map<string, WorkspaceTask[]>()

		for (const task of filteredTasks.value) {
			const key = `${task.spaceId}::${task.projectId ?? '__missing__'}`
			const bucket = byProject.get(key) ?? []
			bucket.push(task)
			byProject.set(key, bucket)
		}

		const groups: ProjectGroup[] = []

		for (const [groupKey, list] of byProject.entries()) {
			const sample = list[0]
			const projects = getProjectsOfSpace(sample.spaceId)
			const project = sample.projectId ? projects.find((item) => item.id === sample.projectId) : null

			const leads: number[] = []
			for (const task of list) {
				if (task.completedAt && task.createdAt) {
					leads.push(task.completedAt - task.createdAt)
				}
			}
			leads.sort((a, b) => a - b)
			const medianMs = leads.length ? leads[Math.floor(leads.length / 2)] : 0

			groups.push({
				groupKey,
				projectId: sample.projectId ?? `missing:${sample.spaceId}`,
				projectName: project?.title ?? getUnknownProjectLabel(),
				spaceId: sample.spaceId,
				spaceLabel: resolveSpaceLabel(sample.spaceId),
				tasks: list,
				medianLead: formatDuration(medianMs),
			})
		}

		return groups
	})

	const stats = computed(() => {
		const thisWeekTasks = tasks.value.filter(
			(task) => task.completedAt && isInDateRange(task.completedAt) && task.doneReason !== 'cancelled',
		)
		const activeProjectIds = new Set<string>()
		for (const task of thisWeekTasks) {
			if (task.projectId) activeProjectIds.add(task.projectId)
		}
		const spaceIds = new Set(thisWeekTasks.map((task) => task.spaceId))
		return {
			thisWeekCount: thisWeekTasks.length,
			activeProjectCount: activeProjectIds.size,
			spaceCount: spaceIds.size,
		}
	})

	watch(
		tasks,
		(rows) => {
			const spaceIds = Array.from(new Set(rows.map((task) => task.spaceId)))
			for (const sid of spaceIds) {
				syncProjectsSnapshot(sid)
				void refreshWorkspaceProjectsQuery(sid).then(() => {
					syncProjectsSnapshot(sid)
				})
			}
		},
		{ immediate: true },
	)

	function onOpenReflection(task: WorkspaceTask) {
		reflectionTask.value = task
		reflectionText.value = ''
		reflectionOpen.value = true
	}

	function onReflectionSave() {
		toast.add({
			title: t('review.finishList.toast.savedPlaceholderTitle'),
			description: t('review.finishList.toast.savedPlaceholderDescription'),
			color: 'neutral',
		})
		reflectionOpen.value = false
	}

	return {
		t,
		loading,
		spaceFilter,
		projectFilter,
		dateRange,
		tagKeyword,
		reflectionOpen,
		reflectionTask,
		reflectionText,
		spaceOptions,
		projectOptions,
		dateRangeOptions,
		projectGroups,
		stats,
		formatDateTime,
		formatDuration,
		onOpenReflection,
		onReflectionSave,
	}
}
