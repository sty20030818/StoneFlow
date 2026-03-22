import { computed, ref } from 'vue'

import { i18n } from '@/plugins/i18n'
import { tauriInvoke } from '@/services/tauri/invoke'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import type {
	RemoteDbProfile,
	RemoteSyncCommandReport,
	RemoteSyncExecutionSummary,
	RemoteSyncSummaryAction,
	RemoteSyncSummaryStepType,
} from '@/types/shared/remote-sync'
import { resolveErrorDetails } from '@/utils/error-message'

type EnsureConnectionResult = {
	profile: RemoteDbProfile
	databaseUrl: string
	fromCache: boolean
}

type RemoteSyncDirection = 'push' | 'pull'

type RemoteSyncActionsController = ReturnType<typeof createRemoteSyncActions>

let remoteSyncActionsSingleton: RemoteSyncActionsController | null = null

function translate(key: string, params?: Record<string, unknown>) {
	return params ? i18n.global.t(key, params) : i18n.global.t(key)
}

function createRemoteSyncActions() {
	const remoteSyncStore = useRemoteSyncStore()
	let syncQueue: Promise<unknown> = Promise.resolve()

	const isPushing = ref(false)
	const isPulling = ref(false)
	const isSyncingNow = ref(false)
	const syncError = ref<string | null>(null)
	const lastPushReport = computed(() => {
		const latestResult = remoteSyncStore.getLatestResult(remoteSyncStore.activeProfileId)
		return latestResult?.reports.push ?? null
	})
	const lastPullReport = computed(() => {
		const latestResult = remoteSyncStore.getLatestResult(remoteSyncStore.activeProfileId)
		return latestResult?.reports.pull ?? null
	})
	const lastPushedAt = computed(() => remoteSyncStore.getLastSyncAt(remoteSyncStore.activeProfileId, 'push'))
	const lastPulledAt = computed(() => remoteSyncStore.getLastSyncAt(remoteSyncStore.activeProfileId, 'pull'))

	const hasActiveProfile = computed(() => !!remoteSyncStore.activeProfileId)
	const isSyncing = computed(() => isPushing.value || isPulling.value || isSyncingNow.value)

	function logError(...args: unknown[]) {
		// console.error('[remote-sync-actions]', ...args)
		void args
	}

	function normalizeSyncError(error: unknown, fallbackKey: string) {
		const details = resolveErrorDetails(error, translate, { fallbackKey })
		if (/pool timed out while waiting for an open connection/i.test(details.message)) {
			return {
				code: details.code,
				message: translate('settings.remoteSync.errors.connectionPoolTimeout'),
			}
		}
		return {
			code: details.code,
			message: details.message,
		}
	}

	function createSummary(action: RemoteSyncSummaryAction): RemoteSyncExecutionSummary {
		return {
			action,
			status: 'skipped',
			profileId: null,
			profileName: '',
			usedConnectionCache: false,
			errorSummary: null,
			errorCode: null,
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

	async function resolveProfileAndUrl(profileId?: string | null) {
		await ensureStoreLoaded()
		const resolvedProfileId = profileId ?? remoteSyncStore.activeProfileId
		if (!resolvedProfileId) {
			throw new Error(translate('settings.remoteSync.errors.noActiveProfile'))
		}
		const profile = remoteSyncStore.profiles.find((item) => item.id === resolvedProfileId) ?? null
		if (!profile) {
			throw new Error(translate('settings.remoteSync.errors.noActiveProfile'))
		}
		const url = await remoteSyncStore.getProfileUrl(profile.id)
		if (!url) {
			throw new Error(translate('settings.remoteSync.errors.noDatabaseUrl'))
		}
		return {
			profile,
			databaseUrl: url,
		}
	}

	async function ensureConnectionReady(
		fallbackKey: string,
		profileId?: string | null,
	): Promise<EnsureConnectionResult> {
		const { profile, databaseUrl } = await resolveProfileAndUrl(profileId)
		if (remoteSyncStore.isConnectionHealthy(profile.id, databaseUrl)) {
			return {
				profile,
				databaseUrl,
				fromCache: true,
			}
		}

		try {
			await tauriInvoke('test_neon_connection', { args: { databaseUrl } })
			try {
				await remoteSyncStore.setConnectionHealth({
					profileId: profile.id,
					databaseUrl,
					result: 'ok',
					errorDigest: null,
				})
			} catch (cacheError) {
				logError('ensureConnectionReady:cache:ok:error', cacheError)
			}
			return {
				profile,
				databaseUrl,
				fromCache: false,
			}
		} catch (error) {
			const normalizedError = normalizeSyncError(error, fallbackKey)
			try {
				await remoteSyncStore.setConnectionHealth({
					profileId: profile.id,
					databaseUrl,
					result: 'error',
					errorDigest: normalizedError.message,
				})
			} catch (cacheError) {
				logError('ensureConnectionReady:cache:error:error', cacheError)
			}
			const e = new Error(normalizedError.message)
			;(e as Error & { code?: string | null }).code = normalizedError.code
			throw e
		}
	}

	async function runSyncDirection(
		direction: RemoteSyncDirection,
		databaseUrl: string,
	): Promise<RemoteSyncCommandReport> {
		const command = direction === 'push' ? 'push_to_neon' : 'pull_from_neon'
		return tauriInvoke<RemoteSyncCommandReport>(command, { args: { databaseUrl } })
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
			errorCode: normalizedError.code,
			report: null,
			fromCache: type === 'ensure' ? false : null,
		})
		summary.status = 'failed'
		summary.errorSummary = normalizedError.message
		summary.errorCode = normalizedError.code
		syncError.value = normalizedError.message
	}

	async function persistExecutionSummary(summary: RemoteSyncExecutionSummary) {
		try {
			await remoteSyncStore.recordSyncExecution(summary)
		} catch (error) {
			logError('recordSyncExecution:error', error)
		}
		return summary
	}

	async function runSingleDirection(
		direction: RemoteSyncDirection,
		action: RemoteSyncSummaryAction,
		loadingFlag: typeof isPushing,
		fallbackKey: string,
		profileId?: string | null,
	): Promise<RemoteSyncExecutionSummary> {
		return enqueueSync(async () => {
			const summary = createSummary(action)
			loadingFlag.value = true
			syncError.value = null

			try {
				const ready = await ensureConnectionReady(fallbackKey, profileId)
				summary.profileId = ready.profile.id
				summary.profileName = ready.profile.name
				summary.usedConnectionCache = ready.fromCache
				summary.steps.push({
					type: 'ensure',
					status: 'success',
					error: null,
					errorCode: null,
					report: null,
					fromCache: ready.fromCache,
				})

				const report = await runSyncDirection(direction, ready.databaseUrl)
				summary.reports[direction] = report
				summary.steps.push({
					type: direction,
					status: 'success',
					error: null,
					errorCode: null,
					report,
					fromCache: null,
				})
				summary.status = 'success'
				return persistExecutionSummary(summary)
			} catch (error) {
				const hasEnsureStep = summary.steps.some((step) => step.type === 'ensure')
				if (hasEnsureStep) {
					appendFailedStep(summary, direction, error, fallbackKey)
				} else {
					appendFailedStep(summary, 'ensure', error, fallbackKey)
				}
				return persistExecutionSummary(summary)
			} finally {
				loadingFlag.value = false
			}
		})
	}

	async function pushToRemote(profileId?: string | null) {
		return runSingleDirection('push', 'push', isPushing, 'settings.remoteSync.toast.pushFailedTitle', profileId)
	}

	async function pullFromRemote(profileId?: string | null) {
		return runSingleDirection('pull', 'pull', isPulling, 'settings.remoteSync.toast.pullFailedTitle', profileId)
	}

	async function syncNow(profileId?: string | null) {
		return enqueueSync(async () => {
			const summary = createSummary('syncNow')
			isSyncingNow.value = true
			syncError.value = null

			try {
				const ready = await ensureConnectionReady('settings.remoteSync.toast.connectionFailedTitle', profileId)
				summary.profileId = ready.profile.id
				summary.profileName = ready.profile.name
				summary.usedConnectionCache = ready.fromCache
				summary.steps.push({
					type: 'ensure',
					status: 'success',
					error: null,
					errorCode: null,
					report: null,
					fromCache: ready.fromCache,
				})

				try {
					const pullReport = await runSyncDirection('pull', ready.databaseUrl)
					summary.reports.pull = pullReport
					summary.steps.push({
						type: 'pull',
						status: 'success',
						error: null,
						errorCode: null,
						report: pullReport,
						fromCache: null,
					})
				} catch (error) {
					appendFailedStep(summary, 'pull', error, 'settings.remoteSync.toast.pullFailedTitle')
					summary.steps.push({
						type: 'push',
						status: 'skipped',
						error: null,
						errorCode: null,
						report: null,
						fromCache: null,
					})
					return persistExecutionSummary(summary)
				}

				try {
					const pushReport = await runSyncDirection('push', ready.databaseUrl)
					summary.reports.push = pushReport
					summary.steps.push({
						type: 'push',
						status: 'success',
						error: null,
						errorCode: null,
						report: pushReport,
						fromCache: null,
					})
					summary.status = 'success'
					return persistExecutionSummary(summary)
				} catch (error) {
					appendFailedStep(summary, 'push', error, 'settings.remoteSync.toast.pushFailedTitle')
					return persistExecutionSummary(summary)
				}
			} catch (error) {
				appendFailedStep(summary, 'ensure', error, 'settings.remoteSync.toast.connectionFailedTitle')
				summary.steps.push({
					type: 'pull',
					status: 'skipped',
					error: null,
					errorCode: null,
					report: null,
					fromCache: null,
				})
				summary.steps.push({
					type: 'push',
					status: 'skipped',
					error: null,
					errorCode: null,
					report: null,
					fromCache: null,
				})
				return persistExecutionSummary(summary)
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
		lastPushReport,
		lastPullReport,
		hasActiveProfile,
		ensureConnectionReady,
		pushToRemote,
		pullFromRemote,
		syncNow,
	}
}

export function useRemoteSyncActions() {
	remoteSyncActionsSingleton ??= createRemoteSyncActions()
	return remoteSyncActionsSingleton
}
