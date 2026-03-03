import { computed, ref, type Ref } from 'vue'

import type { useRemoteSyncActions } from '@/composables/useRemoteSyncActions'
import { invalidateWorkspaceTaskAndProjectQueries } from '@/features/workspace'
import { tauriInvoke } from '@/services/tauri/invoke'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import type { RemoteSyncCommandReport } from '@/types/shared/remote-sync'
import { summarizeRemoteSyncReport } from '@/utils/remote-sync-report'
import { formatDateTime } from '@/utils/time'
import { resolveErrorMessage } from '@/utils/error-message'
import { invalidateRemoteSyncQueries } from '../model'

type Translate = (key: string, params?: Record<string, unknown>) => string

type Logger = (...args: unknown[]) => void

type SyncActionResult = {
	status: 'success' | 'failed'
	errorMessage: string | null
}

export function useRemoteSyncSyncPanel(options: {
	t: Translate
	locale: Ref<string>
	remoteSyncActions: ReturnType<typeof useRemoteSyncActions>
	testingNew: Ref<boolean>
	testingEdit: Ref<boolean>
	setStatus: (status: 'missing' | 'ok' | 'error' | 'testing' | 'syncing') => void
	setStatusByErrorMessage: (message: string | null) => void
	isMissingProfileError: (message: string | null) => boolean
	persistConnectionHealthSafely: (
		input: Parameters<ReturnType<typeof useRemoteSyncStore>['setConnectionHealth']>[0],
		logTag: string,
	) => Promise<void>
	log: Logger
	logError: Logger
}) {
	const {
		t,
		locale,
		remoteSyncActions,
		testingNew,
		testingEdit,
		setStatus,
		setStatusByErrorMessage,
		isMissingProfileError,
		persistConnectionHealthSafely,
		log,
		logError,
	} = options
	const remoteSyncStore = useRemoteSyncStore()
	const toast = useToast()

	const testingCurrent = ref(false)

	const isPushing = remoteSyncActions.isPushing
	const isPulling = remoteSyncActions.isPulling
	const isSyncingNow = remoteSyncActions.isSyncingNow
	const isSyncing = remoteSyncActions.isSyncing
	const syncError = remoteSyncActions.syncError
	const hasActiveProfile = remoteSyncActions.hasActiveProfile
	const lastPushedAt = remoteSyncActions.lastPushedAt
	const lastPulledAt = remoteSyncActions.lastPulledAt
	const lastPushReport = remoteSyncActions.lastPushReport
	const lastPullReport = remoteSyncActions.lastPullReport

	const isTestingAnyConnection = computed(() => testingCurrent.value || testingNew.value || testingEdit.value)

	function resolveSyncSummaryError(summaryError: string | null) {
		return summaryError ?? t('settings.remoteSync.toast.syncInProgressTitle')
	}

	function summarizeSyncNowResult(
		pullReport: RemoteSyncCommandReport | null,
		pushReport: RemoteSyncCommandReport | null,
	) {
		const pullText = pullReport
			? summarizeRemoteSyncReport(pullReport, t('settings.remoteSync.history.noPullStats'), t)
			: t('settings.remoteSync.history.noPullStats')
		const pushText = pushReport
			? summarizeRemoteSyncReport(pushReport, t('settings.remoteSync.history.noPushStats'), t)
			: t('settings.remoteSync.history.noPushStats')
		return t('settings.remoteSync.actionsCard.syncNowSummary', {
			pull: pullText,
			push: pushText,
		})
	}

	async function invalidateRemoteSyncAfterSync() {
		await invalidateRemoteSyncQueries()
	}

	async function handleTestCurrent() {
		if (!remoteSyncStore.activeProfileId) return
		try {
			log('test:current:start', { profileId: remoteSyncStore.activeProfileId })
			testingCurrent.value = true
			setStatus('testing')
			const url = await remoteSyncStore.getActiveProfileUrl()
			if (!url) throw new Error(t('settings.remoteSync.errors.noDatabaseUrl'))
			await tauriInvoke('test_neon_connection', { args: { databaseUrl: url } })
			await persistConnectionHealthSafely(
				{
					profileId: remoteSyncStore.activeProfileId,
					databaseUrl: url,
					result: 'ok',
					errorDigest: null,
				},
				'test:current:cache:ok:error',
			)
			setStatus('ok')
			toast.add({
				title: t('settings.remoteSync.toast.connectionOkTitle'),
				description: t('settings.remoteSync.toast.connectionOkDescription'),
				color: 'success',
			})
			log('test:current:done')
		} catch (error) {
			const currentProfileId = remoteSyncStore.activeProfileId
			const currentProfileUrl = currentProfileId ? await remoteSyncStore.getProfileUrl(currentProfileId).catch(() => null) : null
			if (currentProfileId && currentProfileUrl) {
				await persistConnectionHealthSafely(
					{
						profileId: currentProfileId,
						databaseUrl: currentProfileUrl,
						result: 'error',
						errorDigest: resolveErrorMessage(error, t),
					},
					'test:current:cache:error',
				)
			}
			setStatus('error')
			toast.add({
				title: t('settings.remoteSync.toast.connectionFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('test:current:error', error)
		} finally {
			testingCurrent.value = false
		}
	}

	async function runSyncNowSilently(): Promise<SyncActionResult> {
		setStatus('syncing')
		const summary = await remoteSyncActions.syncNow()
		const pullReport = summary.reports.pull
		const pushReport = summary.reports.push

		if (summary.status === 'success' && (pullReport || pushReport)) {
			await Promise.all([invalidateRemoteSyncAfterSync(), invalidateWorkspaceTaskAndProjectQueries()])
			setStatus('ok')
			return {
				status: 'success',
				errorMessage: null,
			}
		}

		const errorMessage = resolveSyncSummaryError(summary.errorSummary)
		setStatusByErrorMessage(errorMessage)
		return {
			status: 'failed',
			errorMessage,
		}
	}

	async function handlePush() {
		if (isTestingAnyConnection.value) {
			toast.add({ title: t('settings.remoteSync.toast.waitTestingBeforePush'), color: 'neutral' })
			return
		}
		setStatus('syncing')
		log('sync:push:start', { profileId: remoteSyncStore.activeProfileId })
		const summary = await remoteSyncActions.pushToRemote()
		const report = summary.reports.push
		if (summary.status === 'success' && report) {
			await invalidateRemoteSyncAfterSync()
			setStatus('ok')
			toast.add({
				title: t('settings.remoteSync.toast.pushSuccessTitle'),
				description: t('settings.remoteSync.toast.syncAtDescription', {
					time: formatDateTime(report.syncedAt, { locale: locale.value }),
					summary: summarizeRemoteSyncReport(report, '', t),
				}),
				color: 'success',
			})
			log('sync:push:done', { syncedAt: report.syncedAt, fromCache: summary.usedConnectionCache })
			return
		}

		const errorMessage = resolveSyncSummaryError(summary.errorSummary)
		setStatusByErrorMessage(errorMessage)
		toast.add({
			title: t('settings.remoteSync.toast.pushFailedTitle'),
			description: errorMessage,
			color: 'error',
		})
		logError('sync:push:error', errorMessage)
	}

	async function handlePull() {
		if (isTestingAnyConnection.value) {
			toast.add({ title: t('settings.remoteSync.toast.waitTestingBeforePull'), color: 'neutral' })
			return
		}
		setStatus('syncing')
		log('sync:pull:start', { profileId: remoteSyncStore.activeProfileId })
		const summary = await remoteSyncActions.pullFromRemote()
		const report = summary.reports.pull
		if (summary.status === 'success' && report) {
			await Promise.all([invalidateRemoteSyncAfterSync(), invalidateWorkspaceTaskAndProjectQueries()])
			setStatus('ok')
			toast.add({
				title: t('settings.remoteSync.toast.pullSuccessTitle'),
				description: t('settings.remoteSync.toast.syncAtDescription', {
					time: formatDateTime(report.syncedAt, { locale: locale.value }),
					summary: summarizeRemoteSyncReport(report, '', t),
				}),
				color: 'success',
			})
			log('sync:pull:done', { syncedAt: report.syncedAt, fromCache: summary.usedConnectionCache })
			return
		}

		const errorMessage = resolveSyncSummaryError(summary.errorSummary)
		setStatusByErrorMessage(errorMessage)
		toast.add({
			title: t('settings.remoteSync.toast.pullFailedTitle'),
			description: errorMessage,
			color: 'error',
		})
		logError('sync:pull:error', errorMessage)
	}

	async function handleSyncNow() {
		if (isTestingAnyConnection.value) {
			toast.add({ title: t('settings.remoteSync.toast.waitTestingBeforeSyncNow'), color: 'neutral' })
			return
		}

		setStatus('syncing')
		log('sync:now:start', { profileId: remoteSyncStore.activeProfileId })
		const summary = await remoteSyncActions.syncNow()
		const pullReport = summary.reports.pull
		const pushReport = summary.reports.push

		if (summary.status === 'success' && (pullReport || pushReport)) {
			await Promise.all([invalidateRemoteSyncAfterSync(), invalidateWorkspaceTaskAndProjectQueries()])
			setStatus('ok')
			const syncedAt = pushReport?.syncedAt ?? pullReport?.syncedAt ?? Date.now()
			toast.add({
				title: t('settings.remoteSync.toast.syncNowSuccessTitle'),
				description: t('settings.remoteSync.toast.syncAtDescription', {
					time: formatDateTime(syncedAt, { locale: locale.value }),
					summary: summarizeSyncNowResult(pullReport, pushReport),
				}),
				color: 'success',
			})
			log('sync:now:done', { syncedAt, fromCache: summary.usedConnectionCache })
			return
		}

		const errorMessage = resolveSyncSummaryError(summary.errorSummary)
		setStatusByErrorMessage(errorMessage)
		toast.add({
			title: t('settings.remoteSync.toast.syncNowFailedTitle'),
			description: errorMessage,
			color: 'error',
		})
		logError('sync:now:error', errorMessage)
	}

	return {
		isPushing,
		isPulling,
		isSyncingNow,
		isSyncing,
		syncError,
		hasActiveProfile,
		lastPushedAt,
		lastPulledAt,
		lastPushReport,
		lastPullReport,
		testingCurrent,
		isTestingAnyConnection,
		isMissingProfileError,
		handleTestCurrent,
		handlePush,
		handlePull,
		handleSyncNow,
		runSyncNowSilently,
	}
}
