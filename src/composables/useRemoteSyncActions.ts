import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { tauriInvoke } from '@/services/tauri/invoke'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import type { RemoteDbProfile, RemoteSyncCommandReport } from '@/types/shared/remote-sync'
import { resolveErrorMessage } from '@/utils/error-message'

type RemoteSyncSummaryStatus = 'success' | 'failed' | 'skipped'
type RemoteSyncSummaryAction = 'push' | 'pull' | 'syncNow'
type RemoteSyncSummaryStepType = 'ensure' | 'pull' | 'push'

export type RemoteSyncStepSummary = {
	type: RemoteSyncSummaryStepType
	status: RemoteSyncSummaryStatus
	error: string | null
	report: RemoteSyncCommandReport | null
	fromCache: boolean | null
}

export type RemoteSyncExecutionSummary = {
	action: RemoteSyncSummaryAction
	status: RemoteSyncSummaryStatus
	profileId: string | null
	profileName: string
	usedConnectionCache: boolean
	errorSummary: string | null
	reports: {
		push: RemoteSyncCommandReport | null
		pull: RemoteSyncCommandReport | null
	}
	steps: RemoteSyncStepSummary[]
}

type EnsureConnectionResult = {
	profile: RemoteDbProfile
	databaseUrl: string
	fromCache: boolean
}

type RemoteSyncDirection = 'push' | 'pull'

export function useRemoteSyncActions() {
	const remoteSyncStore = useRemoteSyncStore()
	const { t } = useI18n({ useScope: 'global' })
	let syncQueue: Promise<unknown> = Promise.resolve()

	const isPushing = ref(false)
	const isPulling = ref(false)
	const isSyncingNow = ref(false)
	const syncError = ref<string | null>(null)
	const syncHistory = computed(() => remoteSyncStore.syncHistory)
	const lastPushReport = computed(() => syncHistory.value.find((entry) => entry.direction === 'push')?.report ?? null)
	const lastPullReport = computed(() => syncHistory.value.find((entry) => entry.direction === 'pull')?.report ?? null)
	const lastPushedAt = computed(() => remoteSyncStore.getLastSyncAt(remoteSyncStore.activeProfileId, 'push'))
	const lastPulledAt = computed(() => remoteSyncStore.getLastSyncAt(remoteSyncStore.activeProfileId, 'pull'))

	const hasActiveProfile = computed(() => !!remoteSyncStore.activeProfileId)
	const isSyncing = computed(() => isPushing.value || isPulling.value || isSyncingNow.value)

	function logError(...args: unknown[]) {
		// console.error('[remote-sync-actions]', ...args)
		void args
	}

	function normalizeSyncError(error: unknown, fallbackKey: string) {
		const message = resolveErrorMessage(error, t, { fallbackKey })
		if (/pool timed out while waiting for an open connection/i.test(message)) {
			return new Error(t('settings.remoteSync.errors.connectionPoolTimeout'))
		}
		return new Error(message)
	}

	function createSummary(action: RemoteSyncSummaryAction): RemoteSyncExecutionSummary {
		return {
			action,
			status: 'skipped',
			profileId: null,
			profileName: '',
			usedConnectionCache: false,
			errorSummary: null,
			reports: {
				push: null,
				pull: null,
			},
			steps: [],
		}
	}

	function enqueueSync<T>(runner: () => Promise<T>): Promise<T> {
		const next = syncQueue.then(runner, runner)
		syncQueue = next.then(
			() => undefined,
			() => undefined,
		)
		return next
	}

	async function ensureStoreLoaded() {
		if (remoteSyncStore.loaded) return
		await remoteSyncStore.load()
	}

	async function resolveActiveProfileAndUrl() {
		await ensureStoreLoaded()
		const profile = remoteSyncStore.activeProfile
		if (!profile) {
			throw new Error(t('settings.remoteSync.errors.noActiveProfile'))
		}
		const url = await remoteSyncStore.getProfileUrl(profile.id)
		if (!url) {
			throw new Error(t('settings.remoteSync.errors.noDatabaseUrl'))
		}
		return {
			profile,
			databaseUrl: url,
		}
	}

	async function ensureConnectionReady(fallbackKey: string): Promise<EnsureConnectionResult> {
		const { profile, databaseUrl } = await resolveActiveProfileAndUrl()
		if (remoteSyncStore.isConnectionHealthy(profile.id, databaseUrl)) {
			return {
				profile,
				databaseUrl,
				fromCache: true,
			}
		}

		try {
			await tauriInvoke('test_neon_connection', { args: { databaseUrl } })
			await remoteSyncStore.setConnectionHealth({
				profileId: profile.id,
				databaseUrl,
				result: 'ok',
				errorDigest: null,
			})
			return {
				profile,
				databaseUrl,
				fromCache: false,
			}
		} catch (error) {
			const normalizedError = normalizeSyncError(error, fallbackKey)
			await remoteSyncStore.setConnectionHealth({
				profileId: profile.id,
				databaseUrl,
				result: 'error',
				errorDigest: normalizedError.message,
			})
			throw normalizedError
		}
	}

	async function runSyncDirection(
		direction: RemoteSyncDirection,
		profile: RemoteDbProfile,
		databaseUrl: string,
	): Promise<RemoteSyncCommandReport> {
		const command = direction === 'push' ? 'push_to_neon' : 'pull_from_neon'
		const report = await tauriInvoke<RemoteSyncCommandReport>(command, { args: { databaseUrl } })
		try {
			await remoteSyncStore.appendSyncHistory({
				direction,
				profileId: profile.id,
				profileName: profile.name,
				report,
			})
		} catch (error) {
			logError(`appendSyncHistory:${direction}:error`, error)
		}
		return report
	}

	function appendFailedStep(
		summary: RemoteSyncExecutionSummary,
		type: RemoteSyncSummaryStepType,
		error: unknown,
		fallbackKey: string,
	) {
		const normalizedError = normalizeSyncError(error, fallbackKey)
		summary.steps.push({
			type,
			status: 'failed',
			error: normalizedError.message,
			report: null,
			fromCache: type === 'ensure' ? false : null,
		})
		summary.status = 'failed'
		summary.errorSummary = normalizedError.message
		syncError.value = normalizedError.message
	}

	async function runSingleDirection(
		direction: RemoteSyncDirection,
		action: RemoteSyncSummaryAction,
		loadingFlag: typeof isPushing,
		fallbackKey: string,
	): Promise<RemoteSyncExecutionSummary> {
		return enqueueSync(async () => {
			const summary = createSummary(action)
			loadingFlag.value = true
			syncError.value = null

			try {
				const ready = await ensureConnectionReady(fallbackKey)
				summary.profileId = ready.profile.id
				summary.profileName = ready.profile.name
				summary.usedConnectionCache = ready.fromCache
				summary.steps.push({
					type: 'ensure',
					status: 'success',
					error: null,
					report: null,
					fromCache: ready.fromCache,
				})

				const report = await runSyncDirection(direction, ready.profile, ready.databaseUrl)
				summary.reports[direction] = report
				summary.steps.push({
					type: direction,
					status: 'success',
					error: null,
					report,
					fromCache: null,
				})
				summary.status = 'success'
				return summary
			} catch (error) {
				const hasEnsureStep = summary.steps.some((step) => step.type === 'ensure')
				if (hasEnsureStep) {
					appendFailedStep(summary, direction, error, fallbackKey)
				} else {
					appendFailedStep(summary, 'ensure', error, fallbackKey)
				}
				return summary
			} finally {
				loadingFlag.value = false
			}
		})
	}

	async function pushToRemote() {
		return runSingleDirection('push', 'push', isPushing, 'settings.remoteSync.toast.pushFailedTitle')
	}

	async function pullFromRemote() {
		return runSingleDirection('pull', 'pull', isPulling, 'settings.remoteSync.toast.pullFailedTitle')
	}

	async function syncNow() {
		return enqueueSync(async () => {
			const summary = createSummary('syncNow')
			isSyncingNow.value = true
			syncError.value = null

			try {
				const ready = await ensureConnectionReady('settings.remoteSync.toast.connectionFailedTitle')
				summary.profileId = ready.profile.id
				summary.profileName = ready.profile.name
				summary.usedConnectionCache = ready.fromCache
				summary.steps.push({
					type: 'ensure',
					status: 'success',
					error: null,
					report: null,
					fromCache: ready.fromCache,
				})

				try {
					const pullReport = await runSyncDirection('pull', ready.profile, ready.databaseUrl)
					summary.reports.pull = pullReport
					summary.steps.push({
						type: 'pull',
						status: 'success',
						error: null,
						report: pullReport,
						fromCache: null,
					})
				} catch (error) {
					appendFailedStep(summary, 'pull', error, 'settings.remoteSync.toast.pullFailedTitle')
					summary.steps.push({
						type: 'push',
						status: 'skipped',
						error: null,
						report: null,
						fromCache: null,
					})
					return summary
				}

				try {
					const pushReport = await runSyncDirection('push', ready.profile, ready.databaseUrl)
					summary.reports.push = pushReport
					summary.steps.push({
						type: 'push',
						status: 'success',
						error: null,
						report: pushReport,
						fromCache: null,
					})
					summary.status = 'success'
					return summary
				} catch (error) {
					appendFailedStep(summary, 'push', error, 'settings.remoteSync.toast.pushFailedTitle')
					return summary
				}
			} catch (error) {
				appendFailedStep(summary, 'ensure', error, 'settings.remoteSync.toast.connectionFailedTitle')
				summary.steps.push({
					type: 'pull',
					status: 'skipped',
					error: null,
					report: null,
					fromCache: null,
				})
				summary.steps.push({
					type: 'push',
					status: 'skipped',
					error: null,
					report: null,
					fromCache: null,
				})
				return summary
			} finally {
				isSyncingNow.value = false
			}
		})
	}

	return {
		isPushing,
		isPulling,
		isSyncingNow,
		isSyncing,
		syncError,
		lastPushedAt,
		lastPulledAt,
		syncHistory,
		lastPushReport,
		lastPullReport,
		hasActiveProfile,
		ensureConnectionReady,
		pushToRemote,
		pullFromRemote,
		syncNow,
	}
}
