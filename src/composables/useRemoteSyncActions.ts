import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { tauriInvoke } from '@/services/tauri/invoke'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import { resolveErrorMessage } from '@/utils/error-message'
import type { RemoteSyncCommandReport } from '@/types/shared/remote-sync'

export function useRemoteSyncActions() {
	const remoteSyncStore = useRemoteSyncStore()
	const { t } = useI18n({ useScope: 'global' })
	let syncQueue: Promise<unknown> = Promise.resolve()

	const isPushing = ref(false)
	const isPulling = ref(false)
	const syncError = ref<string | null>(null)
	const syncHistory = computed(() => remoteSyncStore.syncHistory)
	const lastPushReport = computed(() => syncHistory.value.find((entry) => entry.direction === 'push')?.report ?? null)
	const lastPullReport = computed(() => syncHistory.value.find((entry) => entry.direction === 'pull')?.report ?? null)
	const lastPushedAt = computed(() => remoteSyncStore.getLastSyncAt(remoteSyncStore.activeProfileId, 'push'))
	const lastPulledAt = computed(() => remoteSyncStore.getLastSyncAt(remoteSyncStore.activeProfileId, 'pull'))

	const hasActiveProfile = computed(() => !!remoteSyncStore.activeProfileId)

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

	async function pushToRemote() {
		return enqueueSync(async () => {
			if (isPushing.value || isPulling.value) return null
			isPushing.value = true
			syncError.value = null

			try {
				const { profile, databaseUrl } = await resolveActiveProfileAndUrl()
				const report = await tauriInvoke<RemoteSyncCommandReport>('push_to_neon', { args: { databaseUrl } })
				try {
					await remoteSyncStore.appendSyncHistory({
						direction: 'push',
						profileId: profile.id,
						profileName: profile.name,
						report,
					})
				} catch (error) {
					logError('appendSyncHistory:push:error', error)
				}
				return report
			} catch (error) {
				const normalizedError = normalizeSyncError(error, 'settings.remoteSync.toast.pushFailedTitle')
				syncError.value = normalizedError.message
				throw normalizedError
			} finally {
				isPushing.value = false
			}
		})
	}

	async function pullFromRemote() {
		return enqueueSync(async () => {
			if (isPushing.value || isPulling.value) return null
			isPulling.value = true
			syncError.value = null

			try {
				const { profile, databaseUrl } = await resolveActiveProfileAndUrl()
				const report = await tauriInvoke<RemoteSyncCommandReport>('pull_from_neon', { args: { databaseUrl } })
				try {
					await remoteSyncStore.appendSyncHistory({
						direction: 'pull',
						profileId: profile.id,
						profileName: profile.name,
						report,
					})
				} catch (error) {
					logError('appendSyncHistory:pull:error', error)
				}
				return report
			} catch (error) {
				const normalizedError = normalizeSyncError(error, 'settings.remoteSync.toast.pullFailedTitle')
				syncError.value = normalizedError.message
				throw normalizedError
			} finally {
				isPulling.value = false
			}
		})
	}

	return {
		isPushing,
		isPulling,
		syncError,
		lastPushedAt,
		lastPulledAt,
		syncHistory,
		lastPushReport,
		lastPullReport,
		hasActiveProfile,
		pushToRemote,
		pullFromRemote,
	}
}
