import { useNow } from '@vueuse/core'
import { computed, ref, type Ref } from 'vue'

import { useRemoteSyncStore } from '@/stores/remote-sync'
import type { RemoteSyncCommandReport, RemoteSyncDirection, RemoteSyncHistoryItem } from '@/types/shared/remote-sync'
import {
	type RemoteSyncTableViewItem,
	summarizeRemoteSyncReport,
	toRemoteSyncTableViewItems,
} from '@/utils/remote-sync-report'
import { resolveErrorMessage } from '@/utils/error-message'
import { formatDateTime, formatRelativeDistance } from '@/utils/time'

export type RemoteSyncHistoryFilter = 'all' | RemoteSyncDirection

export type RemoteSyncHistoryViewItem = {
	id: string
	direction: RemoteSyncDirection
	directionText: string
	profileName: string
	syncedAtText: string
	summary: string
	tables: RemoteSyncTableViewItem[]
}

type Translate = (key: string, params?: Record<string, unknown>) => string

type Logger = (...args: unknown[]) => void

export function useRemoteSyncHistoryPanel(options: {
	t: Translate
	locale: Ref<string>
	lastPushedAt: Ref<number>
	lastPulledAt: Ref<number>
	lastPushReport: Ref<RemoteSyncCommandReport | null>
	lastPullReport: Ref<RemoteSyncCommandReport | null>
	syncHistory: Ref<RemoteSyncHistoryItem[]>
	onHistoryMutated: () => Promise<void>
	logError: Logger
}) {
	const {
		t,
		locale,
		lastPushedAt,
		lastPulledAt,
		lastPushReport,
		lastPullReport,
		syncHistory,
		onHistoryMutated,
		logError,
	} = options
	const remoteSyncStore = useRemoteSyncStore()
	const toast = useToast()
	const now = useNow({ interval: 60_000 })

	const isClearingHistory = ref(false)
	const historyFilter = ref<RemoteSyncHistoryFilter>('all')

	const historyFilterOptions = computed(() => [
		{ label: t('settings.remoteSync.history.filters.all'), value: 'all' as const },
		{ label: t('settings.remoteSync.history.filters.pushOnly'), value: 'push' as const },
		{ label: t('settings.remoteSync.history.filters.pullOnly'), value: 'pull' as const },
	])

	const filteredSyncHistory = computed(() => {
		if (historyFilter.value === 'all') return syncHistory.value
		return syncHistory.value.filter((item) => item.direction === historyFilter.value)
	})

	const recentSyncHistory = computed<RemoteSyncHistoryViewItem[]>(() =>
		filteredSyncHistory.value.slice(0, 6).map((item) => toHistoryViewItem(item)),
	)

	const lastPushedText = computed(() =>
		formatRelativeTime(lastPushedAt.value, t('settings.remoteSync.history.neverPushed')),
	)

	const lastPulledText = computed(() =>
		formatRelativeTime(lastPulledAt.value, t('settings.remoteSync.history.neverPulled')),
	)

	const lastSyncedText = computed(() => {
		const latestSyncedAt = Math.max(lastPushedAt.value, lastPulledAt.value)
		return formatRelativeTime(latestSyncedAt, t('settings.remoteSync.history.neverSynced'))
	})

	const lastPushSummaryText = computed(() =>
		summarizeRemoteSyncReport(lastPushReport.value, t('settings.remoteSync.history.noPushStats'), t),
	)

	const lastPullSummaryText = computed(() =>
		summarizeRemoteSyncReport(lastPullReport.value, t('settings.remoteSync.history.noPullStats'), t),
	)

	function toHistoryViewItem(item: RemoteSyncHistoryItem): RemoteSyncHistoryViewItem {
		return {
			id: item.id,
			direction: item.direction,
			directionText:
				item.direction === 'push'
					? t('settings.remoteSync.history.direction.push')
					: t('settings.remoteSync.history.direction.pull'),
			profileName: item.profileName || t('settings.remoteSync.profile.unnamed'),
			syncedAtText: formatDateTime(item.syncedAt, { locale: locale.value }),
			summary: summarizeRemoteSyncReport(item.report, t('settings.remoteSync.history.noStats'), t),
			tables: toRemoteSyncTableViewItems(item.report, t),
		}
	}

	function formatRelativeTime(timestamp: number, fallback: string) {
		if (!Number.isFinite(timestamp) || timestamp <= 0) return fallback
		void now.value
		return formatRelativeDistance(timestamp, {
			locale: locale.value,
			fallback,
		})
	}

	function setHistoryFilter(filter: RemoteSyncHistoryFilter) {
		historyFilter.value = filter
	}

	async function handleClearSyncHistory() {
		if (syncHistory.value.length === 0 || isClearingHistory.value) return
		try {
			isClearingHistory.value = true
			const direction = historyFilter.value === 'all' ? undefined : historyFilter.value
			await remoteSyncStore.clearSyncHistory(direction)
			await onHistoryMutated()
			toast.add({
				title: t('settings.remoteSync.toast.clearedHistoryTitle'),
				description: direction
					? direction === 'push'
						? t('settings.remoteSync.toast.clearedPushHistoryDescription')
						: t('settings.remoteSync.toast.clearedPullHistoryDescription')
					: t('settings.remoteSync.toast.clearedAllHistoryDescription'),
				color: 'success',
			})
		} catch (error) {
			toast.add({
				title: t('settings.remoteSync.toast.clearFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('sync:history:clear:error', error)
		} finally {
			isClearingHistory.value = false
		}
	}

	return {
		historyFilter,
		historyFilterOptions,
		isClearingHistory,
		recentSyncHistory,
		lastPushedText,
		lastPulledText,
		lastSyncedText,
		lastPushSummaryText,
		lastPullSummaryText,
		setHistoryFilter,
		handleClearSyncHistory,
	}
}
