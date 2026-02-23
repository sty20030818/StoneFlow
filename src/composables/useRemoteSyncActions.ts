import { StorageSerializers, useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'

import { tauriInvoke } from '@/services/tauri/invoke'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import type { RemoteSyncCommandReport } from '@/types/shared/remote-sync'

const LAST_PUSHED_AT_KEY = 'neon_last_pushed_at'
const LAST_PULLED_AT_KEY = 'neon_last_pulled_at'

export function useRemoteSyncActions() {
	const remoteSyncStore = useRemoteSyncStore()
	let syncQueue: Promise<unknown> = Promise.resolve()

	const isPushing = ref(false)
	const isPulling = ref(false)
	const syncError = ref<string | null>(null)
	const syncHistory = computed(() => remoteSyncStore.syncHistory)
	const lastPushReport = computed(() => syncHistory.value.find((entry) => entry.direction === 'push')?.report ?? null)
	const lastPullReport = computed(() => syncHistory.value.find((entry) => entry.direction === 'pull')?.report ?? null)

	// 同步时间统一交给 VueUse 持久化，并强制 number 序列化，缺省值为 0（表示未同步）。
	const lastPushedAt = useStorage<number>(LAST_PUSHED_AT_KEY, 0, undefined, {
		serializer: StorageSerializers.number,
	})
	const lastPulledAt = useStorage<number>(LAST_PULLED_AT_KEY, 0, undefined, {
		serializer: StorageSerializers.number,
	})

	const hasActiveProfile = computed(() => !!remoteSyncStore.activeProfileId)

	function logError(...args: unknown[]) {
		// console.error('[remote-sync-actions]', ...args)
		void args
	}

	function normalizeSyncError(error: unknown, fallback: string) {
		const message = error instanceof Error ? error.message : fallback
		if (/pool timed out while waiting for an open connection/i.test(message)) {
			return new Error('连接池超时，请稍后重试，或降低并发后再同步')
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
			throw new Error('未配置远端数据库')
		}
		const url = await remoteSyncStore.getProfileUrl(profile.id)
		if (!url) {
			throw new Error('未找到数据库地址')
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
				lastPushedAt.value = report.syncedAt
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
				const normalizedError = normalizeSyncError(error, '上传失败')
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
				lastPulledAt.value = report.syncedAt
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
				const normalizedError = normalizeSyncError(error, '下载失败')
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
