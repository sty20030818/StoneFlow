import { computed, onMounted, ref } from 'vue'

import { tauriInvoke } from '@/services/tauri/invoke'
import { useRemoteSyncStore } from '@/stores/remote-sync'

const LAST_PUSHED_AT_KEY = 'neon_last_pushed_at'
const LAST_PULLED_AT_KEY = 'neon_last_pulled_at'

function toTimestamp(value: string | null) {
	if (!value) return null
	const parsed = Number.parseInt(value, 10)
	return Number.isNaN(parsed) ? null : parsed
}

export function useRemoteSyncActions() {
	const remoteSyncStore = useRemoteSyncStore()

	const isPushing = ref(false)
	const isPulling = ref(false)
	const syncError = ref<string | null>(null)

	const lastPushedAt = ref<number | null>(null)
	const lastPulledAt = ref<number | null>(null)

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

	function persistTimes() {
		if (lastPushedAt.value) {
			localStorage.setItem(LAST_PUSHED_AT_KEY, String(lastPushedAt.value))
		}
		if (lastPulledAt.value) {
			localStorage.setItem(LAST_PULLED_AT_KEY, String(lastPulledAt.value))
		}
	}

	function loadPersistedTimes() {
		lastPushedAt.value = toTimestamp(localStorage.getItem(LAST_PUSHED_AT_KEY))
		lastPulledAt.value = toTimestamp(localStorage.getItem(LAST_PULLED_AT_KEY))
	}

	async function pushToRemote() {
		if (isPushing.value || isPulling.value) return null
		isPushing.value = true
		syncError.value = null

		try {
			const databaseUrl = await resolveActiveDatabaseUrl()
			const ts = await tauriInvoke<number>('push_to_neon', { args: { databaseUrl } })
			lastPushedAt.value = ts
			persistTimes()
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
			persistTimes()
			return ts
		} catch (error) {
			syncError.value = error instanceof Error ? error.message : '下载失败'
			throw error
		} finally {
			isPulling.value = false
		}
	}

	onMounted(() => {
		loadPersistedTimes()
	})

	return {
		isPushing,
		isPulling,
		syncError,
		lastPushedAt,
		lastPulledAt,
		hasActiveProfile,
		loadPersistedTimes,
		pushToRemote,
		pullFromRemote,
	}
}
