import { useRemoteSyncActions } from '@/features/settings/remote-sync/logic/useRemoteSyncActions'
import { useRemoteSyncStore } from '@/features/settings/remote-sync/store'
import type { RemoteDbProfile, RemoteSyncPolicy } from '@/shared/types/shared/remote-sync'

import { invalidateAfterRemoteSync } from './remote-sync-runtime'

const COORDINATOR_TICK_MS = 60_000
const STARTUP_SYNC_SESSION_KEY = 'remote-sync:start-sync-ran'
const STARTUP_FOCUS_SUPPRESS_MS = 3_000

type RemoteSyncTriggerSource = 'appStart' | 'focus' | 'interval' | 'online'

type RemoteSyncProfileStateLite = {
	lastRunAt: number
}

type RemoteSyncStoreLike = {
	loaded: boolean
	load: () => Promise<void>
	profiles: RemoteDbProfile[]
	getSyncPolicy: (profileId: string | null) => RemoteSyncPolicy
	getProfileState: (profileId: string | null) => RemoteSyncProfileStateLite | null
}

type RemoteSyncActionSummary = {
	status: 'success' | 'failed' | 'skipped'
	errorSummary: string | null
}

type RemoteSyncActionsLike = {
	syncNow: (profileId?: string | null) => Promise<RemoteSyncActionSummary>
}

type RemoteSyncCoordinatorEventTarget = {
	addEventListener: (
		type: 'focus' | 'online',
		listener: () => void,
	) => void
}

type IntervalHandle = ReturnType<typeof setInterval>

type RemoteSyncCoordinatorDeps = {
	createStore: () => RemoteSyncStoreLike
	createActions: () => RemoteSyncActionsLike
	invalidateAfterRemoteSync: (options?: { refreshWorkspace?: boolean }) => Promise<void>
	eventTarget: RemoteSyncCoordinatorEventTarget | null
	isOnline: () => boolean
	setInterval: (callback: () => void, delay: number) => IntervalHandle
	clearInterval: (handle: IntervalHandle) => void
	sleep: (delayMs: number) => Promise<void>
}

function log(...args: unknown[]) {
	// console.log('[remote-sync-coordinator]', ...args)
	void args
}

function logError(...args: unknown[]) {
	// console.error('[remote-sync-coordinator]', ...args)
	void args
}

function shouldRunForSource(syncPolicy: RemoteSyncPolicy, source: RemoteSyncTriggerSource) {
	if (!syncPolicy.enabled) return false
	if (source === 'appStart') return syncPolicy.runOnAppStart
	if (source === 'focus') return syncPolicy.runOnWindowFocus
	if (source === 'interval') return syncPolicy.runOnInterval
	return true
}

function createRemoteSyncCoordinator(deps: RemoteSyncCoordinatorDeps) {
	let installed = false
	let tickTimer: IntervalHandle | null = null
	let bootPromise: Promise<void> | null = null
	let suppressFocusUntil = 0

	function hasStartupSyncRanInSession() {
		if (typeof window === 'undefined') return false
		try {
			return window.sessionStorage.getItem(STARTUP_SYNC_SESSION_KEY) === '1'
		} catch {
			return false
		}
	}

	function markStartupSyncRanInSession() {
		if (typeof window === 'undefined') return
		try {
			window.sessionStorage.setItem(STARTUP_SYNC_SESSION_KEY, '1')
		} catch {
			// 忽略浏览器存储异常，协调器继续按无缓存模式运行。
		}
	}

	async function ensureStoreLoaded() {
		const remoteSyncStore = deps.createStore()
		if (!remoteSyncStore.loaded) {
			await remoteSyncStore.load()
		}
		return remoteSyncStore
	}

	async function runProfileSync(profileId: string, source: RemoteSyncTriggerSource) {
		const remoteSyncStore = deps.createStore()
		const remoteSyncActions = deps.createActions()
		const syncPolicy = remoteSyncStore.getSyncPolicy(profileId)
		const maxRetries = Math.max(0, Math.floor(syncPolicy.retryCount))

		for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
			const summary = await remoteSyncActions.syncNow(profileId)
			if (summary.status === 'success') {
				log('profile:sync:done', { profileId, source, attempt })
				return true
			}

			if (attempt >= maxRetries) {
				logError('profile:sync:failed', { profileId, source, attempt, error: summary.errorSummary })
				return false
			}

			await deps.sleep(Math.min(4000, 1000 * (attempt + 1)))
		}

		return false
	}

	async function runProfilesBySource(source: RemoteSyncTriggerSource) {
		const remoteSyncStore = await ensureStoreLoaded()
		if (!deps.isOnline()) return

		const profileIds = remoteSyncStore.profiles
			.filter((profile) => shouldRunForSource(remoteSyncStore.getSyncPolicy(profile.id), source))
			.map((profile) => profile.id)

		let hasSuccessfulSync = false
		for (const profileId of profileIds) {
			hasSuccessfulSync = (await runProfileSync(profileId, source)) || hasSuccessfulSync
		}
		if (hasSuccessfulSync) {
			await deps.invalidateAfterRemoteSync({ refreshWorkspace: true })
		}
	}

	async function runDueProfilesByInterval() {
		const remoteSyncStore = await ensureStoreLoaded()
		if (!deps.isOnline()) return

		const now = Date.now()
		const dueProfileIds = remoteSyncStore.profiles
			.filter((profile) => {
				const syncPolicy = remoteSyncStore.getSyncPolicy(profile.id)
				if (!shouldRunForSource(syncPolicy, 'interval')) return false
				const profileState = remoteSyncStore.getProfileState(profile.id)
				const intervalMs = Math.max(1, syncPolicy.intervalMinutes) * 60_000
				return now - (profileState?.lastRunAt ?? 0) >= intervalMs
			})
			.map((profile) => profile.id)

		let hasSuccessfulSync = false
		for (const profileId of dueProfileIds) {
			hasSuccessfulSync = (await runProfileSync(profileId, 'interval')) || hasSuccessfulSync
		}
		if (hasSuccessfulSync) {
			await deps.invalidateAfterRemoteSync({ refreshWorkspace: true })
		}
	}

	function installCoordinatorListeners() {
		if (!deps.eventTarget) return
		deps.eventTarget.addEventListener('focus', () => {
			if (Date.now() < suppressFocusUntil) return
			void runProfilesBySource('focus')
		})
		deps.eventTarget.addEventListener('online', () => {
			void runProfilesBySource('online')
		})
	}

	function installCoordinatorTimer() {
		if (tickTimer) {
			deps.clearInterval(tickTimer)
		}
		tickTimer = deps.setInterval(() => {
			void runDueProfilesByInterval()
		}, COORDINATOR_TICK_MS)
	}

	async function boot() {
		await ensureStoreLoaded()
		installCoordinatorTimer()
		// 启动或前端刷新后的短时间内忽略 focus，避免把刷新当成“回到前台”。
		suppressFocusUntil = Date.now() + STARTUP_FOCUS_SUPPRESS_MS
		if (hasStartupSyncRanInSession()) return
		// 同一应用会话里只执行一次启动同步；前端刷新不应重复触发。
		markStartupSyncRanInSession()
		void runProfilesBySource('appStart')
	}

	async function install() {
		if (installed) {
			return bootPromise ?? Promise.resolve()
		}

		installed = true
		installCoordinatorListeners()
		bootPromise = boot().catch((error) => {
			logError('coordinator:boot:error', error)
			throw error
		})
		return bootPromise
	}

	return {
		install,
	}
}

const remoteSyncCoordinator = createRemoteSyncCoordinator({
	createStore: () => useRemoteSyncStore(),
	createActions: () => useRemoteSyncActions(),
	invalidateAfterRemoteSync,
	eventTarget: typeof window === 'undefined' ? null : window,
	isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
	setInterval: (callback, delay) => setInterval(callback, delay),
	clearInterval: (handle) => clearInterval(handle),
	sleep: (delayMs) =>
		new Promise<void>((resolve) => {
			setTimeout(resolve, delayMs)
		}),
})

export async function installRemoteSyncCoordinator() {
	return remoteSyncCoordinator.install()
}
