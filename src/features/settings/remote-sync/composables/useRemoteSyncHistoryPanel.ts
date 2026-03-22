import { computed, type Ref } from 'vue'

import { useRemoteSyncStore } from '@/stores/remote-sync'
import type { RemoteSyncCommandReport } from '@/types/shared/remote-sync'
import { summarizeRemoteSyncReport } from '@/utils/remote-sync-report'
import { formatRelativeDistance } from '@/utils/time'

export type RemoteSyncDiagnosticStepViewItem = {
	id: string
	label: string
	status: 'success' | 'failed' | 'skipped'
	error: string | null
	errorCode: string | null
	summary: string | null
	fromCacheText: string | null
}

type Translate = (key: string, params?: Record<string, unknown>) => string

export function useRemoteSyncHistoryPanel(options: {
	t: Translate
	locale: Ref<string>
	lastPushedAt: Ref<number>
	lastPulledAt: Ref<number>
	lastPushReport: Ref<RemoteSyncCommandReport | null>
	lastPullReport: Ref<RemoteSyncCommandReport | null>
}) {
	const { t, locale, lastPushedAt, lastPulledAt, lastPushReport, lastPullReport } = options
	const remoteSyncStore = useRemoteSyncStore()

	const activeProfileId = computed(() => remoteSyncStore.activeProfileId)
	const latestDiagnostic = computed(() => remoteSyncStore.getLatestDiagnostic(activeProfileId.value))

	const latestDiagnosticSteps = computed<RemoteSyncDiagnosticStepViewItem[]>(() => {
		const diagnostic = latestDiagnostic.value
		if (!diagnostic) return []
		return diagnostic.steps.map((step, index) => ({
			id: `${diagnostic.action}-${step.type}-${index}`,
			label:
				step.type === 'ensure'
					? t('settings.remoteSync.actions.testCurrent')
					: step.type === 'pull'
						? t('common.actions.download')
						: t('common.actions.upload'),
			status: step.status,
			error: step.error,
			errorCode: step.errorCode ?? null,
			summary: step.report ? summarizeRemoteSyncReport(step.report, t('settings.remoteSync.history.noStats'), t) : null,
			fromCacheText:
				step.fromCache === null
					? null
					: step.fromCache
						? t('settings.remoteSync.status.label.ok')
						: t('settings.remoteSync.status.label.testing'),
		}))
	})

	const hasDiagnostic = computed(() => latestDiagnosticSteps.value.length > 0)

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

	function formatRelativeTime(timestamp: number, fallback: string) {
		if (!Number.isFinite(timestamp) || timestamp <= 0) return fallback
		return formatRelativeDistance(timestamp, {
			locale: locale.value,
			fallback,
		})
	}

	return {
		latestDiagnosticSteps,
		hasDiagnostic,
		lastPushedText,
		lastPulledText,
		lastSyncedText,
		lastPushSummaryText,
		lastPullSummaryText,
	}
}
