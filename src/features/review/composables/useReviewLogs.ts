import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { SPACE_DISPLAY, SPACE_IDS } from '@/config/space'
import { resolveErrorMessage } from '@/utils/error-message'
import { formatDate, formatTimeOfDay } from '@/utils/time'

import type { InspectorActivityLog, InspectorActivityLogEntityType } from '../model'
import { listReviewActivityLogs } from '../queries'

const PAGE_SIZE = 100

type ReviewAggregateGroup = {
	key: string
	projectName: string
	spaceId: string
	count: number
	actions: string[]
	completedCount: number
	completedRatio: number
}

export function useReviewLogs() {
	const toast = useToast()
	const { t, locale } = useI18n({ useScope: 'global' })

	const loading = ref(false)
	const loadingMore = ref(false)
	const hasMore = ref(true)
	const pageOffset = ref(0)
	const rawLogs = ref<InspectorActivityLog[]>([])

	const viewMode = ref<'raw' | 'aggregate'>('raw')

	const entityType = ref<InspectorActivityLogEntityType | 'all'>('all')
	const spaceFilter = ref<string>('all')
	const dateRange = ref<string>('this-week')

	const entityTypeOptions = computed(() => [
		{ label: t('review.logs.filters.entityType.all'), value: 'all' },
		{ label: t('review.logs.filters.entityType.task'), value: 'task' },
		{ label: t('review.logs.filters.entityType.project'), value: 'project' },
	])

	const spaceOptions = computed(() => [
		{ label: t('review.filters.allSpaces'), value: 'all' },
		...SPACE_IDS.map((id) => ({ label: SPACE_DISPLAY[id].label, value: id })),
	])

	const dateRangeOptions = computed(() => [
		{ label: t('review.filters.thisWeek'), value: 'this-week' },
		{ label: t('review.filters.thisMonth'), value: 'this-month' },
		{ label: t('review.filters.allTime'), value: 'all' },
	])

	function getRangeFilterValue() {
		const now = new Date()
		if (dateRange.value === 'this-week') {
			return {
				from: now.getTime() - 7 * 24 * 60 * 60 * 1000,
				to: now.getTime(),
			}
		}
		if (dateRange.value === 'this-month') {
			return {
				from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
				to: now.getTime(),
			}
		}
		return {
			from: undefined,
			to: undefined,
		}
	}

	function buildListArgs(offset: number) {
		const range = getRangeFilterValue()
		return {
			entityType: entityType.value === 'all' ? undefined : entityType.value,
			spaceId: spaceFilter.value === 'all' ? undefined : spaceFilter.value,
			from: range.from,
			to: range.to,
			limit: PAGE_SIZE,
			offset,
		}
	}

	const logs = computed(() => rawLogs.value)

	function formatDateTime(ts: number): string {
		const date = formatDate(ts, { locale: locale.value })
		const time = formatTimeOfDay(ts, { locale: locale.value })
		return `${date} ${time}`
	}

	function formatVariableInfo(item: InspectorActivityLog): string {
		const parts = [`action=${item.action}`]
		if (item.fieldKey) {
			parts.push(`fieldKey=${item.fieldKey}`)
		}
		if (item.fieldLabel) {
			parts.push(`fieldLabel=${item.fieldLabel}`)
		}
		return parts.join(' · ')
	}

	function formatChangeSummary(item: InspectorActivityLog): string | null {
		if (item.beforeValue === null && item.afterValue === null) return null
		return `${item.beforeValue ?? t('review.logs.emptyValue')} → ${item.afterValue ?? t('review.logs.emptyValue')}`
	}

	function formatAggregateAction(item: InspectorActivityLog): string {
		if (!item.fieldKey) return item.actionLabel
		return `${item.actionLabel}(${item.fieldKey})`
	}

	const todayGroups = computed<ReviewAggregateGroup[]>(() => {
		const now = new Date()
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
		const byKey = new Map<string, ReviewAggregateGroup>()

		for (const entry of logs.value) {
			if (entry.createdAt < startOfDay) continue
			const key = `${entry.spaceId}-${entry.projectName}`
			const group =
				byKey.get(key) ??
				({
					key,
					projectName: entry.projectName,
					spaceId: entry.spaceId,
					count: 0,
					actions: [],
					completedCount: 0,
					completedRatio: 0,
				} as ReviewAggregateGroup)
			group.count += 1
			const actionText = formatAggregateAction(entry)
			if (!group.actions.includes(actionText)) group.actions.push(actionText)
			if (entry.action === 'task_completed') group.completedCount += 1
			byKey.set(key, group)
		}

		const result: ReviewAggregateGroup[] = []
		for (const group of byKey.values()) {
			group.completedRatio = group.count ? Math.round((group.completedCount / group.count) * 100) : 0
			result.push(group)
		}
		return result
	})

	const last7dGroups = computed<ReviewAggregateGroup[]>(() => {
		const from = Date.now() - 7 * 24 * 60 * 60 * 1000
		const byKey = new Map<string, ReviewAggregateGroup>()

		for (const entry of logs.value) {
			if (entry.createdAt < from) continue
			const key = `${entry.spaceId}-${entry.projectName}`
			const group =
				byKey.get(key) ??
				({
					key,
					projectName: entry.projectName,
					spaceId: entry.spaceId,
					count: 0,
					actions: [],
					completedCount: 0,
					completedRatio: 0,
				} as ReviewAggregateGroup)
			group.count += 1
			const actionText = formatAggregateAction(entry)
			if (!group.actions.includes(actionText)) group.actions.push(actionText)
			if (entry.action === 'task_completed') group.completedCount += 1
			byKey.set(key, group)
		}

		const result: ReviewAggregateGroup[] = []
		for (const group of byKey.values()) {
			group.completedRatio = group.count ? Math.round((group.completedCount / group.count) * 100) : 0
			result.push(group)
		}
		return result
	})

	async function fetchLogsPage(options: { reset: boolean }) {
		if (options.reset) {
			loading.value = true
			pageOffset.value = 0
			hasMore.value = true
		} else {
			if (loadingMore.value || !hasMore.value) return
			loadingMore.value = true
		}

		try {
			const items = await listReviewActivityLogs(buildListArgs(pageOffset.value))
			if (options.reset) {
				rawLogs.value = items
			} else {
				rawLogs.value = rawLogs.value.concat(items)
			}
			pageOffset.value += items.length
			hasMore.value = items.length >= PAGE_SIZE
		} catch (error) {
			toast.add({
				title: t('review.logs.toast.loadFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
		} finally {
			if (options.reset) {
				loading.value = false
			} else {
				loadingMore.value = false
			}
		}
	}

	async function refresh() {
		await fetchLogsPage({ reset: true })
	}

	async function loadMore() {
		await fetchLogsPage({ reset: false })
	}

	function exportLogs() {
		const data = logs.value
		if (!data.length) {
			toast.add({ title: t('review.logs.toast.noExportDataTitle'), color: 'neutral' })
			return
		}

		try {
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const anchor = document.createElement('a')
			anchor.href = url
			anchor.download = `logs-${Date.now()}.json`
			document.body.appendChild(anchor)
			anchor.click()
			document.body.removeChild(anchor)
			URL.revokeObjectURL(url)
			toast.add({ title: t('review.logs.toast.exportSuccessTitle'), color: 'success' })
		} catch (error) {
			toast.add({
				title: t('review.logs.toast.exportFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
		}
	}

	onMounted(() => {
		void refresh()
	})

	watch([entityType, spaceFilter, dateRange], () => {
		void refresh()
	})

	return {
		loading,
		loadingMore,
		hasMore,
		logs,
		viewMode,
		entityType,
		spaceFilter,
		dateRange,
		entityTypeOptions,
		spaceOptions,
		dateRangeOptions,
		todayGroups,
		last7dGroups,
		formatDateTime,
		formatVariableInfo,
		formatChangeSummary,
		loadMore,
		refresh,
		exportLogs,
	}
}
