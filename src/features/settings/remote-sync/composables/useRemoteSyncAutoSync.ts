import { useOnline } from '@vueuse/core'
import { computed, type Ref } from 'vue'

import { useRemoteSyncStore } from '@/stores/remote-sync'
import { formatDateTime } from '@/utils/time'
import { resolveErrorMessage } from '@/utils/error-message'

type Translate = (key: string, params?: Record<string, unknown>) => string

type Logger = (...args: unknown[]) => void

export function useRemoteSyncAutoSync(options: {
	t: Translate
	locale: Ref<string>
	logError: Logger
}) {
	const { t, locale, logError } = options
	const remoteSyncStore = useRemoteSyncStore()
	const toast = useToast()
	const online = useOnline()

	const syncPreferences = computed(() => remoteSyncStore.syncPreferences)
	const activeProfileState = computed(() => remoteSyncStore.getProfileState(remoteSyncStore.activeProfileId))
	const latestResult = computed(() => activeProfileState.value?.latestResult ?? null)
	const autoSyncIntervalOptions = computed(() =>
		[5, 15, 30, 60].map((minutes) => ({
			label: t('settings.remoteSync.autoSync.intervalOption', { minutes }),
			value: minutes,
		})),
	)
	const autoSyncRetryOptions = computed(() =>
		[0, 1, 2, 3].map((count) => ({
			label: t('settings.remoteSync.autoSync.retryOption', { count }),
			value: count,
		})),
	)

	const autoSyncStatusText = computed(() => {
		if (!syncPreferences.value.enabled) return t('settings.remoteSync.autoSync.meta.disabled')
		if (latestResult.value?.status === 'failed') return t('settings.remoteSync.autoSync.status.failed')
		if (latestResult.value?.status === 'success') return t('settings.remoteSync.autoSync.status.success')
		return t('settings.remoteSync.autoSync.status.idle')
	})

	const autoSyncMetaText = computed(() => {
		if (!syncPreferences.value.enabled) return t('settings.remoteSync.autoSync.meta.disabled')
		if (!online.value) return t('settings.remoteSync.autoSync.meta.offline')
		const lastRunAt = activeProfileState.value?.lastRunAt ?? 0
		if (lastRunAt <= 0) return t('settings.remoteSync.autoSync.meta.neverRun')
		return t('settings.remoteSync.autoSync.meta.lastRun', {
			source: t('settings.remoteSync.autoSync.trigger.interval'),
			time: formatDateTime(lastRunAt, { locale: locale.value }),
		})
	})

	const autoSyncLastError = computed(() => latestResult.value?.errorMessage ?? null)

	async function updateSyncPreferencesPatch(patch: Parameters<typeof remoteSyncStore.updateSyncPreferences>[0]) {
		try {
			await remoteSyncStore.updateSyncPreferences(patch)
		} catch (error) {
			toast.add({
				title: t('settings.remoteSync.toast.updateAutoSyncFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('auto-sync:preferences:update:error', error)
		}
	}

	function handleUpdateAutoSyncEnabled(value: boolean) {
		void updateSyncPreferencesPatch({ enabled: value })
	}

	function handleUpdateAutoSyncIntervalMinutes(value: number) {
		if (!Number.isFinite(value) || value <= 0) return
		void updateSyncPreferencesPatch({ intervalMinutes: Math.round(value) })
	}

	function handleUpdateAutoSyncRetryCount(value: number) {
		if (!Number.isFinite(value) || value < 0) return
		void updateSyncPreferencesPatch({ retryCount: Math.round(value) })
	}

	function handleUpdateAutoSyncRunOnAppStart(value: boolean) {
		void updateSyncPreferencesPatch({ runOnAppStart: value })
	}

	function handleUpdateAutoSyncRunOnWindowFocus(value: boolean) {
		void updateSyncPreferencesPatch({ runOnWindowFocus: value })
	}

	return {
		online,
		syncPreferences,
		autoSyncIntervalOptions,
		autoSyncRetryOptions,
		autoSyncStatusText,
		autoSyncMetaText,
		autoSyncLastError,
		handleUpdateAutoSyncEnabled,
		handleUpdateAutoSyncIntervalMinutes,
		handleUpdateAutoSyncRetryCount,
		handleUpdateAutoSyncRunOnAppStart,
		handleUpdateAutoSyncRunOnWindowFocus,
	}
}
