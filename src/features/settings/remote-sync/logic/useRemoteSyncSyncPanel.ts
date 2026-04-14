import { computed, ref, type Ref } from 'vue'

import type { useRemoteSyncActions } from './useRemoteSyncActions'
import { testRemoteSyncConnection, invalidateAfterRemoteSync } from '@/infra/sync/remote-sync-runtime'
import { useRemoteSyncStore } from '../store'
import type { RemoteSyncCommandReport } from '@/shared/types/shared/remote-sync'
import { summarizeRemoteSyncReport } from '@/shared/lib/remote-sync-report'
import { formatDateTime } from '@/shared/lib/time'

type Translate = (key: string, params?: Record<string, unknown>) => string

type Logger = (...args: unknown[]) => void

type SyncActionResult = {
	status: 'success' | 'failed'
	errorMessage: string | null
}

type SyncCompletionOptions = {
	summary: Awaited<ReturnType<ReturnType<typeof useRemoteSyncActions>['syncNow']>>
	successTitle: string
	successDescription: string
	failedTitle: string
	logTag: 'sync:push' | 'sync:pull' | 'sync:now'
	refreshWorkspace?: boolean
	successSyncedAt?: number
	showToast?: boolean
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

	async function completeSyncAction(options: SyncCompletionOptions): Promise<SyncActionResult> {
		const {
			summary,
			successTitle,
			successDescription,
			failedTitle,
			logTag,
			refreshWorkspace = false,
			successSyncedAt,
			showToast = true,
		} = options

		const hasSuccessfulReports = Boolean(summary.reports.pull || summary.reports.push)
		if (summary.status === 'success' && hasSuccessfulReports) {
			await invalidateAfterRemoteSync({ refreshWorkspace })
			setStatus('ok')
			if (showToast) {
				toast.add({
					title: successTitle,
					description: successDescription,
					color: 'success',
				})
			}
			log(`${logTag}:done`, {
				syncedAt: successSyncedAt ?? Date.now(),
				fromCache: summary.usedConnectionCache,
			})
			return {
				status: 'success',
				errorMessage: null,
			}
		}

		const errorMessage = resolveSyncSummaryError(summary.errorSummary)
		setStatusByErrorMessage(errorMessage)
		if (showToast) {
			toast.add({
				title: failedTitle,
				description: errorMessage,
				color: 'error',
			})
		}
		logError(`${logTag}:error`, errorMessage)
		return {
			status: 'failed',
			errorMessage,
		}
	}

	async function handleTestCurrent() {
		if (!remoteSyncStore.activeProfileId) return
		try {
			log('test:current:start', { profileId: remoteSyncStore.activeProfileId })
			testingCurrent.value = true
			setStatus('testing')
			const url = await remoteSyncStore.getActiveProfileUrl()
			if (!url) throw new Error(t('settings.remoteSync.errors.noDatabaseUrl'))
			await testRemoteSyncConnection(url)
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
			const currentProfileUrl = currentProfileId
				? await remoteSyncStore.getProfileUrl(currentProfileId).catch(() => null)
				: null
			if (currentProfileId && currentProfileUrl) {
				await persistConnectionHealthSafely(
					{
						profileId: currentProfileId,
						databaseUrl: currentProfileUrl,
						result: 'error',
						errorDigest: error instanceof Error ? error.message : String(error),
					},
					'test:current:cache:error',
				)
			}
			setStatus('error')
			toast.add({
				title: t('settings.remoteSync.toast.connectionFailedTitle'),
				description: error instanceof Error ? error.message : String(error),
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
		const syncedAt = summary.reports.push?.syncedAt ?? summary.reports.pull?.syncedAt ?? Date.now()
		return completeSyncAction({
			summary,
			successTitle: '',
			successDescription: '',
			failedTitle: '',
			logTag: 'sync:now',
			refreshWorkspace: true,
			successSyncedAt: syncedAt,
			showToast: false,
		})
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
		await completeSyncAction({
			summary,
			successTitle: t('settings.remoteSync.toast.pushSuccessTitle'),
			successDescription: report
				? t('settings.remoteSync.toast.syncAtDescription', {
					time: formatDateTime(report.syncedAt, { locale: locale.value }),
					summary: summarizeRemoteSyncReport(report, '', t),
				})
				: '',
			failedTitle: t('settings.remoteSync.toast.pushFailedTitle'),
			logTag: 'sync:push',
			successSyncedAt: report?.syncedAt ?? Date.now(),
		})
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
		await completeSyncAction({
			summary,
			successTitle: t('settings.remoteSync.toast.pullSuccessTitle'),
			successDescription: report
				? t('settings.remoteSync.toast.syncAtDescription', {
					time: formatDateTime(report.syncedAt, { locale: locale.value }),
					summary: summarizeRemoteSyncReport(report, '', t),
				})
				: '',
			failedTitle: t('settings.remoteSync.toast.pullFailedTitle'),
			logTag: 'sync:pull',
			refreshWorkspace: true,
			successSyncedAt: report?.syncedAt ?? Date.now(),
		})
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
		const syncedAt = pushReport?.syncedAt ?? pullReport?.syncedAt ?? Date.now()
		await completeSyncAction({
			summary,
			successTitle: t('settings.remoteSync.toast.syncNowSuccessTitle'),
			successDescription: t('settings.remoteSync.toast.syncAtDescription', {
				time: formatDateTime(syncedAt, { locale: locale.value }),
				summary: summarizeSyncNowResult(pullReport, pushReport),
			}),
			failedTitle: t('settings.remoteSync.toast.syncNowFailedTitle'),
			logTag: 'sync:now',
			refreshWorkspace: true,
			successSyncedAt: syncedAt,
		})
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
