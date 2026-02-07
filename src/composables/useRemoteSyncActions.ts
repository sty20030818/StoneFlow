import { StorageSerializers, useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'

import { tauriInvoke } from '@/services/tauri/invoke'
import { useRemoteSyncStore } from '@/stores/remote-sync'

const LAST_PUSHED_AT_KEY = 'neon_last_pushed_at'
const LAST_PULLED_AT_KEY = 'neon_last_pulled_at'

export function useRemoteSyncActions() {
	const remoteSyncStore = useRemoteSyncStore()

	const isPushing = ref(false)
	const isPulling = ref(false)
	const syncError = ref<string | null>(null)

	// 同步时间统一交给 VueUse 持久化，并强制 number 序列化，缺省值为 0（表示未同步）。
	const lastPushedAt = useStorage<number>(LAST_PUSHED_AT_KEY, 0, undefined, {
		serializer: StorageSerializers.number,
	})
	const lastPulledAt = useStorage<number>(LAST_PULLED_AT_KEY, 0, undefined, {
		serializer: StorageSerializers.number,
	})

	const hasActiveProfile = computed(() => !!remoteSyncStore.activeProfileId)

	async function ensureStoreLoaded() {
		if (remoteSyncStore.loaded) return
		await remoteSyncStore.load()
	}

	async function resolveActiveDatabaseUrl() {
		await ensureStoreLoaded()
		const profile = remoteSyncStore.activeProfile
		if (!profile) {
			throw new Error('未配置远端数据库')
		}
		const url = await remoteSyncStore.getProfileUrl(profile.id)
		if (!url) {
			throw new Error('未找到数据库地址')
		}
		return url
	}

	async function pushToRemote() {
		if (isPushing.value || isPulling.value) return null
		isPushing.value = true
		syncError.value = null

		try {
			const databaseUrl = await resolveActiveDatabaseUrl()
			const ts = await tauriInvoke<number>('push_to_neon', { args: { databaseUrl } })
			lastPushedAt.value = ts
			return ts
		} catch (error) {
			syncError.value = error instanceof Error ? error.message : '上传失败'
			throw error
		} finally {
			isPushing.value = false
		}
	}

	async function pullFromRemote() {
		if (isPushing.value || isPulling.value) return null
		isPulling.value = true
		syncError.value = null

		try {
			const databaseUrl = await resolveActiveDatabaseUrl()
			const ts = await tauriInvoke<number>('pull_from_neon', { args: { databaseUrl } })
			lastPulledAt.value = ts
			return ts
		} catch (error) {
			syncError.value = error instanceof Error ? error.message : '下载失败'
			throw error
		} finally {
			isPulling.value = false
		}
	}

	return {
		isPushing,
		isPulling,
		syncError,
		lastPushedAt,
		lastPulledAt,
		hasActiveProfile,
		pushToRemote,
		pullFromRemote,
	}
}
