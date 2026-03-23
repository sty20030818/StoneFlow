import { useNow } from '@vueuse/core'
import { computed, onMounted, ref, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useRemoteSyncActions } from '@/composables/useRemoteSyncActions'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import { formatRelativeDistance } from '@/utils/time'

export type AutoSyncCardState = 'booting' | 'missing' | 'idle' | 'syncing' | 'error' | 'success'

type AutoSyncCardOverview = {
	state: ComputedRef<AutoSyncCardState>
	title: ComputedRef<string>
	statusLabel: ComputedRef<string>
	subtitle: ComputedRef<string>
	iconName: ComputedRef<string>
	chipColor: ComputedRef<'neutral' | 'primary' | 'success' | 'error'>
	primaryActionLabel: ComputedRef<string>
	settingsActionLabel: ComputedRef<string>
	primaryDisabled: ComputedRef<boolean>
	settingsTo: string
	remoteSyncSettingsTo: string
	handlePrimaryAction: () => Promise<void>
}

export function useRemoteSyncOverview(): AutoSyncCardOverview {
	const remoteSyncStore = useRemoteSyncStore()
	const remoteSyncActions = useRemoteSyncActions()
	const router = useRouter()
	const { t, locale } = useI18n({ useScope: 'global' })
	const isBooting = ref(!remoteSyncStore.loaded)
	const loadFailed = ref(false)
	const now = useNow({ interval: 60_000 })

	const activeProfileId = computed(() => remoteSyncStore.activeProfileId)
	const hasActiveProfile = computed(() => Boolean(activeProfileId.value))
	const latestResult = computed(() => remoteSyncStore.getLatestResult(activeProfileId.value))
	const syncPreferences = computed(() => remoteSyncStore.getSyncPolicy(activeProfileId.value))

	onMounted(async () => {
		if (remoteSyncStore.loaded) {
			isBooting.value = false
			return
		}

		try {
			await remoteSyncStore.load()
			loadFailed.value = false
		} catch {
			loadFailed.value = true
		} finally {
			isBooting.value = false
		}
	})

	const state = computed<AutoSyncCardState>(() => {
		if (isBooting.value) return 'booting'
		if (loadFailed.value) return 'error'
		if (!hasActiveProfile.value) return 'missing'
		if (remoteSyncActions.isSyncing.value) return 'syncing'
		if (latestResult.value?.status === 'failed') return 'error'
		if (latestResult.value?.status === 'success') return 'success'
		return 'idle'
	})

	const title = computed(() => t('sidebar.autoSyncCard.title'))

	const statusLabel = computed(() => {
		switch (state.value) {
			case 'booting':
				return t('sidebar.autoSyncCard.status.booting')
			case 'missing':
				return t('sidebar.autoSyncCard.status.missing')
			case 'syncing':
				return t('sidebar.autoSyncCard.status.syncing')
			case 'error':
				return t('sidebar.autoSyncCard.status.error')
			case 'success':
				return t('sidebar.autoSyncCard.status.success')
			default:
				return syncPreferences.value.enabled
					? t('sidebar.autoSyncCard.status.idle')
					: t('sidebar.autoSyncCard.status.disabled')
		}
	})

	const subtitle = computed(() => {
		switch (state.value) {
			case 'booting':
				return t('sidebar.autoSyncCard.summary.booting')
			case 'missing':
				return t('sidebar.autoSyncCard.summary.missing')
			case 'syncing':
				return t('sidebar.autoSyncCard.summary.syncing')
			case 'error':
				return loadFailed.value
					? t('sidebar.autoSyncCard.summary.loadFailed')
					: t('sidebar.autoSyncCard.summary.error')
			case 'success':
				// 显式依赖 now，保证“上次同步”相对时间会按分钟自动刷新。
				void now.value
				return t('sidebar.autoSyncCard.summary.lastSynced', {
					text: formatRelativeDistance(latestResult.value?.syncedAt ?? null, {
						locale: locale.value,
						fallback: t('sidebar.autoSyncCard.summary.justNow'),
					}),
				})
			default:
				return syncPreferences.value.enabled
					? t('sidebar.autoSyncCard.summary.idle')
					: t('sidebar.autoSyncCard.summary.disabled')
		}
	})

	const iconName = computed(() => {
		switch (state.value) {
			case 'booting':
			case 'syncing':
				return 'i-lucide-refresh-cw'
			case 'missing':
				return 'i-lucide-cloud-off'
			case 'error':
				return 'i-lucide-circle-alert'
			case 'success':
				return 'i-lucide-cloud-check'
			default:
				return 'i-lucide-cloud'
		}
	})

	const chipColor = computed<'neutral' | 'primary' | 'success' | 'error'>(() => {
		switch (state.value) {
			case 'syncing':
			case 'booting':
				return 'primary'
			case 'error':
				return 'error'
			case 'success':
				return 'success'
			default:
				return 'neutral'
		}
	})

	const primaryDisabled = computed(() => isBooting.value || state.value === 'syncing')

	const primaryActionLabel = computed(() =>
		hasActiveProfile.value
			? t('sidebar.autoSyncCard.actions.syncNow')
			: t('sidebar.autoSyncCard.actions.openRemoteSync'),
	)

	const settingsActionLabel = computed(() => t('sidebar.autoSyncCard.actions.openSettings'))

	async function handlePrimaryAction(): Promise<void> {
		if (primaryDisabled.value) return

		if (!hasActiveProfile.value) {
			await router.push('/settings/remote-sync')
			return
		}

		await remoteSyncActions.syncNow(activeProfileId.value)
	}

	return {
		state,
		title,
		statusLabel,
		subtitle,
		iconName,
		chipColor,
		primaryActionLabel,
		settingsActionLabel,
		primaryDisabled,
		settingsTo: '/settings',
		remoteSyncSettingsTo: '/settings/remote-sync',
		handlePrimaryAction,
	}
}
