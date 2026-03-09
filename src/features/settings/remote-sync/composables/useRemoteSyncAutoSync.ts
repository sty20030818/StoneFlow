import { useDocumentVisibility, useIntervalFn, useOnline } from '@vueuse/core'
import { computed, ref, watch, type Ref } from 'vue'

import { useRemoteSyncStore } from '@/stores/remote-sync'
import { formatDateTime } from '@/utils/time'
import { resolveErrorMessage } from '@/utils/error-message'

type Translate = (key: string, params?: Record<string, unknown>) => string

type Logger = (...args: unknown[]) => void

type AutoSyncSource = 'interval' | 'focus' | 'appStart'

export function useRemoteSyncAutoSync(options: {
	t: Translate
	locale: Ref<string>
	isSyncing: Ref<boolean>
	isTestingAnyConnection: Ref<boolean>
	runSyncNowSilently: () => Promise<{ status: 'success' | 'failed'; errorMessage: string | null }>
	logError: Logger
}) {
	const { t, locale, isSyncing, isTestingAnyConnection, runSyncNowSilently, logError } = options
	const remoteSyncStore = useRemoteSyncStore()
	const toast = useToast()
	const visibility = useDocumentVisibility()
	const online = useOnline()

	const syncPreferences = computed(() => remoteSyncStore.syncPreferences)
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

	const autoSyncRunning = ref(false)
	const autoSyncEnqueued = ref(false)
	const autoSyncLastStatus = ref<'idle' | 'running' | 'success' | 'failed'>('idle')
	const autoSyncLastError = ref<string | null>(null)
	const autoSyncLastTriggeredAt = ref(0)
	const autoSyncLastSource = ref<AutoSyncSource | null>(null)

	const autoSyncStatusText = computed(() => {
		switch (autoSyncLastStatus.value) {
			case 'running':
				return t('settings.remoteSync.autoSync.status.running')
			case 'success':
				return t('settings.remoteSync.autoSync.status.success')
			case 'failed':
				return t('settings.remoteSync.autoSync.status.failed')
			default:
				return t('settings.remoteSync.autoSync.status.idle')
		}
	})

	const autoSyncMetaText = computed(() => {
		if (!syncPreferences.value.enabled) return t('settings.remoteSync.autoSync.meta.disabled')
		if (!online.value) return t('settings.remoteSync.autoSync.meta.offline')
		if (autoSyncLastTriggeredAt.value <= 0) return t('settings.remoteSync.autoSync.meta.neverRun')
		const sourceText =
			autoSyncLastSource.value === 'interval'
				? t('settings.remoteSync.autoSync.trigger.interval')
				: autoSyncLastSource.value === 'focus'
					? t('settings.remoteSync.autoSync.trigger.focus')
					: t('settings.remoteSync.autoSync.trigger.appStart')
		return t('settings.remoteSync.autoSync.meta.lastRun', {
			source: sourceText,
			time: formatDateTime(autoSyncLastTriggeredAt.value, { locale: locale.value }),
		})
	})

	const autoSyncIntervalMs = computed(() => Math.max(1, syncPreferences.value.intervalMinutes) * 60_000)

	function sleep(ms: number) {
		return new Promise<void>((resolve) => setTimeout(resolve, ms))
	}

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

	async function triggerAutoSync(source: AutoSyncSource) {
		if (!syncPreferences.value.enabled) return
		if (!online.value) return
		if (isTestingAnyConnection.value) return
		if (autoSyncEnqueued.value || autoSyncRunning.value || isSyncing.value) return

		autoSyncEnqueued.value = true
		autoSyncRunning.value = true
		autoSyncLastStatus.value = 'running'
		autoSyncLastError.value = null
		autoSyncLastTriggeredAt.value = Date.now()
		autoSyncLastSource.value = source

		try {
			const maxRetries = Math.max(0, Math.floor(syncPreferences.value.retryCount))
			for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
				const result = await runSyncNowSilently()
				if (result.status === 'success') {
					autoSyncLastStatus.value = 'success'
					autoSyncLastError.value = null
					return
				}

				autoSyncLastError.value = result.errorMessage
				if (attempt >= maxRetries) {
					autoSyncLastStatus.value = 'failed'
					return
				}

				await sleep(Math.min(4000, 1000 * (attempt + 1)))
			}
		} catch (error) {
			autoSyncLastStatus.value = 'failed'
			autoSyncLastError.value = resolveErrorMessage(error, t)
			logError('auto-sync:run:error', error)
		} finally {
			autoSyncRunning.value = false
			autoSyncEnqueued.value = false
		}
	}

	const { pause: pauseAutoSyncTimer, resume: resumeAutoSyncTimer } = useIntervalFn(
		() => {
			void triggerAutoSync('interval')
		},
		autoSyncIntervalMs,
		{ immediate: false, immediateCallback: false },
	)

	watch(
		() => syncPreferences.value.enabled,
		(enabled) => {
			if (enabled) {
				resumeAutoSyncTimer()
				return
			}
			pauseAutoSyncTimer()
			autoSyncLastStatus.value = 'idle'
		},
		{ immediate: true },
	)

	watch(
		visibility,
		(next, previous) => {
			if (next !== 'visible' || previous === 'visible') return
			if (!syncPreferences.value.enabled || !syncPreferences.value.runOnWindowFocus) return
			void triggerAutoSync('focus')
		},
		{ flush: 'post' },
	)

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
		triggerAutoSync,
	}
}
