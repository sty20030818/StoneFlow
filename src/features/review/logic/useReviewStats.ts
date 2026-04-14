import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { toBoundedPercent } from '@/shared/composables/base/percent'
import { TASK_DONE_REASON_COLORS, TASK_STATUS_CHART_COLORS } from '@/shared/config/task'
import { SPACE_DISPLAY, SPACE_IDS } from '@/shared/config/space'
import { resolveErrorMessage } from '@/shared/lib/error-message'

import type { WorkspaceTask } from '../model'
import { listReviewTasksByStatus } from '../queries'

type ReviewStatusSlice = {
	key: string
	label: string
	color: string
	count: number
	percent: number
	offset: number
}

export function useReviewStats() {
	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })

	const { state: tasks, isLoading: loading } = useAsyncState(
		async () => {
			const [todo, done] = await Promise.all([listReviewTasksByStatus('todo'), listReviewTasksByStatus('done')])
			return [...todo, ...done]
		},
		[] as WorkspaceTask[],
		{
			immediate: true,
			resetOnExecute: false,
			onError: (error) => {
				toast.add({
					title: t('review.stats.toast.loadFailedTitle'),
					description: resolveErrorMessage(error, t),
					color: 'error',
				})
			},
		},
	)

	const spaceCards = computed(() => {
		const now = new Date()
		const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime()

		return SPACE_IDS.map((id) => {
			const info = SPACE_DISPLAY[id]
			const scoped = tasks.value.filter((task) => task.spaceId === id)

			const thisWeekDone = scoped.filter(
				(task) => task.completedAt && task.completedAt >= startOfWeek && task.doneReason !== 'cancelled',
			).length

			const activeProjectIds = new Set<string>()
			for (const task of scoped) {
				if (task.status === 'todo') {
					activeProjectIds.add('default')
				}
			}

			return {
				...info,
				thisWeekDone,
				activeProjects: activeProjectIds.size,
			}
		})
	})

	const last7d = computed(() => {
		const days: { date: string; count: number; percent: number }[] = []
		const now = new Date()

		for (let i = 6; i >= 0; i -= 1) {
			const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
			const key = `${date.getMonth() + 1}/${date.getDate()}`
			const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
			const end = start + 24 * 60 * 60 * 1000

			const count = tasks.value.filter(
				(task) =>
					task.completedAt && task.completedAt >= start && task.completedAt < end && task.doneReason !== 'cancelled',
			).length
			days.push({ date: key, count, percent: 0 })
		}

		const max = days.reduce((acc, item) => (item.count > acc ? item.count : acc), 0)
		for (const day of days) {
			day.percent = max > 0 ? toBoundedPercent((day.count / max) * 100, 6, 100) : 0
		}
		return days
	})

	const statusTotal = computed(() => tasks.value.length)

	const statusSlices = computed<ReviewStatusSlice[]>(() => {
		const buckets: { key: string; label: string; color: string; match: (task: WorkspaceTask) => boolean }[] = [
			{
				key: 'done',
				label: t('task.doneReason.completed'),
				color: TASK_DONE_REASON_COLORS.completed,
				match: (task) => task.status === 'done' && task.doneReason !== 'cancelled',
			},
			{
				key: 'cancelled',
				label: t('task.doneReason.cancelled'),
				color: TASK_DONE_REASON_COLORS.cancelled,
				match: (task) => task.status === 'done' && task.doneReason === 'cancelled',
			},
			{
				key: 'todo',
				label: t('task.status.todo'),
				color: TASK_STATUS_CHART_COLORS.todo,
				match: (task) => task.status === 'todo',
			},
		]

		const total = tasks.value.length || 1
		let offset = 25
		const slices: ReviewStatusSlice[] = []

		for (const bucket of buckets) {
			const count = tasks.value.filter(bucket.match).length
			const percent = toBoundedPercent((count / total) * 100)
			if (percent <= 0) continue
			slices.push({
				key: bucket.key,
				label: bucket.label,
				color: bucket.color,
				count,
				percent,
				offset,
			})
			offset -= (percent / 100) * 100
		}

		return slices
	})

	return {
		loading,
		spaceCards,
		last7d,
		statusTotal,
		statusSlices,
	}
}
