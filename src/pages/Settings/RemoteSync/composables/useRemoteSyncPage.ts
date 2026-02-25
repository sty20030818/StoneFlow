import { useI18n } from 'vue-i18n'
import { useDocumentVisibility, useIntervalFn, useNow, useOnline } from '@vueuse/core'
import { computed, onMounted, ref, watch } from 'vue'

import { useRemoteSyncActions } from '@/composables/useRemoteSyncActions'
import { validateWithZod } from '@/composables/base/zod'
import { postgresUrlSchema, remoteImportListSchema, remoteProfileSchema } from '@/composables/domain/validation/forms'
import { tauriInvoke } from '@/services/tauri/invoke'
import { useRefreshSignalsStore } from '@/stores/refresh-signals'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import { resolveErrorMessage } from '@/utils/error-message'
import type {
	RemoteDbProfile,
	RemoteDbProfileInput,
	RemoteSyncCommandReport,
	RemoteSyncDirection,
	RemoteSyncHistoryItem,
} from '@/types/shared/remote-sync'
import {
	type RemoteSyncTableViewItem,
	summarizeRemoteSyncReport,
	toRemoteSyncTableViewItems,
} from '@/utils/remote-sync-report'
import { formatDateTime, formatRelativeDistance } from '@/utils/time'

type RemoteSyncHistoryFilter = 'all' | RemoteSyncDirection

type RemoteSyncHistoryViewItem = {
	id: string
	direction: RemoteSyncDirection
	directionText: string
	profileName: string
	syncedAtText: string
	summary: string
	tables: RemoteSyncTableViewItem[]
}

export function useRemoteSyncPage() {
	const remoteSyncStore = useRemoteSyncStore()
	const refreshSignals = useRefreshSignalsStore()
	const toast = useToast()
	const { t, locale } = useI18n({ useScope: 'global' })
	// const logPrefix = '[settings-remote-sync]'
	const now = useNow({ interval: 60_000 })

	const {
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
		pushToRemote,
		pullFromRemote,
		syncNow,
	} = useRemoteSyncActions()

	function log(...args: unknown[]) {
		// console.log(logPrefix, ...args)
		void args
	}

	function logError(...args: unknown[]) {
		// console.error(logPrefix, ...args)
		void args
	}

	const createOpen = ref(false)
	const importOpen = ref(false)
	const editProfileId = ref<string | null>(null)
	const editOpen = computed({
		get: () => !!editProfileId.value,
		set: (val) => {
			if (!val) editProfileId.value = null
		},
	})

	const newName = ref('')
	const newUrl = ref('')
	const editName = ref('')
	const editUrl = ref('')

	const importText = ref('')
	const importError = ref('')

	const testingCurrent = ref(false)
	const testingNew = ref(false)
	const testingEdit = ref(false)
	const savingNew = ref(false)
	const savingEdit = ref(false)
	const importing = ref(false)
	const isClearingHistory = ref(false)
	const historyFilter = ref<RemoteSyncHistoryFilter>('all')
	const historyFilterOptions = computed(() => [
		{ label: t('settings.remoteSync.history.filters.all'), value: 'all' as const },
		{ label: t('settings.remoteSync.history.filters.pushOnly'), value: 'push' as const },
		{ label: t('settings.remoteSync.history.filters.pullOnly'), value: 'pull' as const },
	])
	const visibility = useDocumentVisibility()
	const online = useOnline()

	const deleting = ref(false)
	const deleteTarget = ref<RemoteDbProfile | null>(null)

	const profiles = computed(() => remoteSyncStore.profiles)
	const activeProfileId = computed(() => remoteSyncStore.activeProfileId)
	const activeProfile = computed(() => remoteSyncStore.activeProfile)
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
	const autoSyncLastSource = ref<'interval' | 'focus' | 'appStart' | null>(null)
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

	const status = ref<'missing' | 'ok' | 'error' | 'testing' | 'syncing'>('missing')
	const statusMessage = computed(() => {
		switch (status.value) {
			case 'ok':
				return t('settings.remoteSync.status.message.ok')
			case 'error':
				return t('settings.remoteSync.status.message.error')
			case 'testing':
				return t('settings.remoteSync.status.message.testing')
			case 'syncing':
				return t('settings.remoteSync.status.message.syncing')
			default:
				return t('settings.remoteSync.status.message.missing')
		}
	})

	const statusLabel = computed(() => {
		switch (status.value) {
			case 'ok':
				return t('settings.remoteSync.status.label.ok')
			case 'error':
				return t('settings.remoteSync.status.label.error')
			case 'testing':
				return t('settings.remoteSync.status.label.testing')
			case 'syncing':
				return t('settings.remoteSync.status.label.syncing')
			default:
				return t('settings.remoteSync.status.label.missing')
		}
	})

	const statusBadgeVariant = computed(() => (status.value === 'ok' || status.value === 'syncing' ? 'soft' : 'outline'))
	const statusBadgeClass = computed(() => {
		switch (status.value) {
			case 'ok':
				return 'bg-primary/10 text-primary'
			case 'error':
				return 'bg-error/10 text-error'
			case 'testing':
				return 'bg-amber-500/10 text-amber-600'
			case 'syncing':
				return 'bg-primary/10 text-primary'
			default:
				return 'bg-elevated text-muted'
		}
	})

	const canSaveNew = computed(() => validateWithZod(remoteProfileSchema, { name: newName.value, url: newUrl.value }).ok)
	const canTestNew = computed(() => validateWithZod(postgresUrlSchema, newUrl.value).ok)
	const canSaveEdit = computed(
		() => validateWithZod(remoteProfileSchema, { name: editName.value, url: editUrl.value }).ok,
	)
	const canTestEdit = computed(() => validateWithZod(postgresUrlSchema, editUrl.value).ok)
	const canImport = computed(() => importText.value.trim().length > 0)

	const deleteOpen = computed({
		get: () => !!deleteTarget.value,
		set: (val) => {
			if (!val) deleteTarget.value = null
		},
	})

	const lastPushedText = computed(() => {
		return formatRelativeTime(lastPushedAt.value, t('settings.remoteSync.history.neverPushed'))
	})

	const lastPulledText = computed(() => {
		return formatRelativeTime(lastPulledAt.value, t('settings.remoteSync.history.neverPulled'))
	})

	const lastPushSummaryText = computed(() =>
		summarizeRemoteSyncReport(lastPushReport.value, t('settings.remoteSync.history.noPushStats'), t),
	)
	const lastPullSummaryText = computed(() =>
		summarizeRemoteSyncReport(lastPullReport.value, t('settings.remoteSync.history.noPullStats'), t),
	)
	const filteredSyncHistory = computed(() => {
		if (historyFilter.value === 'all') return syncHistory.value
		return syncHistory.value.filter((item) => item.direction === historyFilter.value)
	})
	const recentSyncHistory = computed<RemoteSyncHistoryViewItem[]>(() =>
		filteredSyncHistory.value.slice(0, 6).map((item) => toHistoryViewItem(item)),
	)

	function formatRelativeTime(timestamp: number, fallback: string) {
		if (!Number.isFinite(timestamp) || timestamp <= 0) return fallback
		void now.value
		return formatRelativeDistance(timestamp, {
			locale: locale.value,
			fallback,
		})
	}

	async function refreshStatusByActiveProfileCache() {
		const currentProfileId = remoteSyncStore.activeProfileId
		if (!currentProfileId) {
			status.value = 'missing'
			return
		}

		try {
			const url = await remoteSyncStore.getActiveProfileUrl()
			if (!url) {
				status.value = 'missing'
				return
			}

			if (remoteSyncStore.isConnectionHealthy(currentProfileId, url)) {
				status.value = 'ok'
				return
			}

			const health = remoteSyncStore.getConnectionHealth(currentProfileId, url)
			if (!health) {
				status.value = 'missing'
				return
			}

			status.value = health.result === 'ok' ? 'ok' : 'error'
		} catch (error) {
			logError('status:refresh:error', error)
			status.value = 'error'
		}
	}

	function formatProfileMeta(profile: RemoteDbProfile) {
		const source =
			profile.source === 'import'
				? t('settings.remoteSync.profile.source.import')
				: t('settings.remoteSync.profile.source.manual')
		return `${source} · ${formatDateTime(profile.updatedAt, { locale: locale.value })}`
	}

	function isMissingProfileError(message: string | null) {
		if (!message) return false
		return (
			message === t('settings.remoteSync.errors.noActiveProfile') ||
			message === t('settings.remoteSync.errors.noDatabaseUrl')
		)
	}

	function resolveSyncSummaryError(summaryError: string | null) {
		return summaryError ?? t('settings.remoteSync.toast.syncInProgressTitle')
	}

	function summarizeSyncNowResult(
		pullReport: RemoteSyncCommandReport | null,
		pushReport: RemoteSyncCommandReport | null,
	) {
		const pullText = pullReport
			? summarizeRemoteSyncReport(pullReport, t('settings.remoteSync.history.noPullStats'), t)
			: t('settings.remoteSync.history.noPullStats')
		const pushText = pushReport
			? summarizeRemoteSyncReport(pushReport, t('settings.remoteSync.history.noPushStats'), t)
			: t('settings.remoteSync.history.noPushStats')
		return t('settings.remoteSync.actionsCard.syncNowSummary', {
			pull: pullText,
			push: pushText,
		})
	}

	function toHistoryViewItem(item: RemoteSyncHistoryItem): RemoteSyncHistoryViewItem {
		return {
			id: item.id,
			direction: item.direction,
			directionText:
				item.direction === 'push'
					? t('settings.remoteSync.history.direction.push')
					: t('settings.remoteSync.history.direction.pull'),
			profileName: item.profileName || t('settings.remoteSync.profile.unnamed'),
			syncedAtText: formatDateTime(item.syncedAt, { locale: locale.value }),
			summary: summarizeRemoteSyncReport(item.report, t('settings.remoteSync.history.noStats'), t),
			tables: toRemoteSyncTableViewItems(item.report, t),
		}
	}

	function setHistoryFilter(filter: RemoteSyncHistoryFilter) {
		historyFilter.value = filter
	}

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

	async function triggerAutoSync(source: 'interval' | 'focus' | 'appStart') {
		if (!syncPreferences.value.enabled) return
		if (!online.value) return
		if (testingCurrent.value || testingNew.value || testingEdit.value) return
		if (autoSyncEnqueued.value || autoSyncRunning.value || isSyncing.value) return

		autoSyncEnqueued.value = true
		autoSyncRunning.value = true
		autoSyncLastStatus.value = 'running'
		autoSyncLastError.value = null
		autoSyncLastTriggeredAt.value = Date.now()
		autoSyncLastSource.value = source
		status.value = 'syncing'

		try {
			const maxRetries = Math.max(0, Math.floor(syncPreferences.value.retryCount))
			for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
				const summary = await syncNow()
				if (summary.status === 'success') {
					status.value = 'ok'
					autoSyncLastStatus.value = 'success'
					autoSyncLastError.value = null
					refreshSignals.bumpProject()
					return
				}

				const errorMessage = resolveSyncSummaryError(summary.errorSummary)
				autoSyncLastError.value = errorMessage
				status.value = isMissingProfileError(errorMessage) ? 'missing' : 'error'

				if (attempt >= maxRetries) {
					autoSyncLastStatus.value = 'failed'
					return
				}

				await sleep(Math.min(4000, 1000 * (attempt + 1)))
			}
		} catch (error) {
			const message = resolveErrorMessage(error, t)
			autoSyncLastStatus.value = 'failed'
			autoSyncLastError.value = message
			status.value = isMissingProfileError(message) ? 'missing' : 'error'
			logError('auto-sync:run:error', error)
		} finally {
			autoSyncRunning.value = false
			autoSyncEnqueued.value = false
		}
	}

	async function handleClearSyncHistory() {
		if (syncHistory.value.length === 0 || isClearingHistory.value) return
		try {
			isClearingHistory.value = true
			const direction = historyFilter.value === 'all' ? undefined : historyFilter.value
			await remoteSyncStore.clearSyncHistory(direction)
			toast.add({
				title: t('settings.remoteSync.toast.clearedHistoryTitle'),
				description: direction
					? direction === 'push'
						? t('settings.remoteSync.toast.clearedPushHistoryDescription')
						: t('settings.remoteSync.toast.clearedPullHistoryDescription')
					: t('settings.remoteSync.toast.clearedAllHistoryDescription'),
				color: 'success',
			})
		} catch (error) {
			toast.add({
				title: t('settings.remoteSync.toast.clearFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('sync:history:clear:error', error)
		} finally {
			isClearingHistory.value = false
		}
	}

	function openCreate() {
		log('open:create')
		createOpen.value = true
	}

	function openImport() {
		log('open:import')
		importOpen.value = true
	}

	async function openEdit(profile: RemoteDbProfile) {
		log('open:edit', { id: profile.id })
		editProfileId.value = profile.id
		editName.value = profile.name
		try {
			editUrl.value = (await remoteSyncStore.getProfileUrl(profile.id)) ?? ''
			log('open:edit:done', { id: profile.id, hasUrl: !!editUrl.value })
		} catch (error) {
			editUrl.value = ''
			toast.add({
				title: t('settings.remoteSync.toast.readProfileFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('open:edit:error', error)
		}
	}

	async function handleTestCurrent() {
		if (!activeProfileId.value) return
		try {
			log('test:current:start', { profileId: activeProfileId.value })
			testingCurrent.value = true
			status.value = 'testing'
			const url = await remoteSyncStore.getActiveProfileUrl()
			if (!url) throw new Error(t('settings.remoteSync.errors.noDatabaseUrl'))
			await tauriInvoke('test_neon_connection', { args: { databaseUrl: url } })
			await remoteSyncStore.setConnectionHealth({
				profileId: activeProfileId.value,
				databaseUrl: url,
				result: 'ok',
				errorDigest: null,
			})
			status.value = 'ok'
			toast.add({
				title: t('settings.remoteSync.toast.connectionOkTitle'),
				description: t('settings.remoteSync.toast.connectionOkDescription'),
				color: 'success',
			})
			log('test:current:done')
		} catch (error) {
			const currentProfileId = activeProfileId.value
			const currentProfileUrl = currentProfileId
				? await remoteSyncStore.getProfileUrl(currentProfileId).catch(() => null)
				: null
			if (currentProfileId && currentProfileUrl) {
				await remoteSyncStore.setConnectionHealth({
					profileId: currentProfileId,
					databaseUrl: currentProfileUrl,
					result: 'error',
					errorDigest: resolveErrorMessage(error, t),
				})
			}
			status.value = 'error'
			toast.add({
				title: t('settings.remoteSync.toast.connectionFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('test:current:error', error)
		} finally {
			testingCurrent.value = false
		}
	}

	async function handlePush() {
		if (testingCurrent.value || testingNew.value || testingEdit.value) {
			toast.add({ title: t('settings.remoteSync.toast.waitTestingBeforePush'), color: 'neutral' })
			return
		}
		status.value = 'syncing'
		log('sync:push:start', { profileId: activeProfileId.value })
		const summary = await pushToRemote()
		const report = summary.reports.push
		if (summary.status === 'success' && report) {
			status.value = 'ok'
			toast.add({
				title: t('settings.remoteSync.toast.pushSuccessTitle'),
				description: t('settings.remoteSync.toast.syncAtDescription', {
					time: formatDateTime(report.syncedAt, { locale: locale.value }),
					summary: summarizeRemoteSyncReport(report, '', t),
				}),
				color: 'success',
			})
			log('sync:push:done', { syncedAt: report.syncedAt, fromCache: summary.usedConnectionCache })
			return
		}

		const errorMessage = resolveSyncSummaryError(summary.errorSummary)
		status.value = isMissingProfileError(errorMessage) ? 'missing' : 'error'
		toast.add({
			title: t('settings.remoteSync.toast.pushFailedTitle'),
			description: errorMessage,
			color: 'error',
		})
		logError('sync:push:error', errorMessage)
	}

	async function handlePull() {
		if (testingCurrent.value || testingNew.value || testingEdit.value) {
			toast.add({ title: t('settings.remoteSync.toast.waitTestingBeforePull'), color: 'neutral' })
			return
		}
		status.value = 'syncing'
		log('sync:pull:start', { profileId: activeProfileId.value })
		const summary = await pullFromRemote()
		const report = summary.reports.pull
		if (summary.status === 'success' && report) {
			refreshSignals.bumpProject()
			status.value = 'ok'
			toast.add({
				title: t('settings.remoteSync.toast.pullSuccessTitle'),
				description: t('settings.remoteSync.toast.syncAtDescription', {
					time: formatDateTime(report.syncedAt, { locale: locale.value }),
					summary: summarizeRemoteSyncReport(report, '', t),
				}),
				color: 'success',
			})
			log('sync:pull:done', { syncedAt: report.syncedAt, fromCache: summary.usedConnectionCache })
			return
		}

		const errorMessage = resolveSyncSummaryError(summary.errorSummary)
		status.value = isMissingProfileError(errorMessage) ? 'missing' : 'error'
		toast.add({
			title: t('settings.remoteSync.toast.pullFailedTitle'),
			description: errorMessage,
			color: 'error',
		})
		logError('sync:pull:error', errorMessage)
	}

	async function handleSyncNow() {
		if (testingCurrent.value || testingNew.value || testingEdit.value) {
			toast.add({ title: t('settings.remoteSync.toast.waitTestingBeforeSyncNow'), color: 'neutral' })
			return
		}
		status.value = 'syncing'
		log('sync:now:start', { profileId: activeProfileId.value })
		const summary = await syncNow()
		const pullReport = summary.reports.pull
		const pushReport = summary.reports.push
		if (summary.status === 'success' && (pullReport || pushReport)) {
			refreshSignals.bumpProject()
			status.value = 'ok'
			const syncedAt = pushReport?.syncedAt ?? pullReport?.syncedAt ?? Date.now()
			toast.add({
				title: t('settings.remoteSync.toast.syncNowSuccessTitle'),
				description: t('settings.remoteSync.toast.syncAtDescription', {
					time: formatDateTime(syncedAt, { locale: locale.value }),
					summary: summarizeSyncNowResult(pullReport, pushReport),
				}),
				color: 'success',
			})
			log('sync:now:done', { syncedAt, fromCache: summary.usedConnectionCache })
			return
		}

		const errorMessage = resolveSyncSummaryError(summary.errorSummary)
		status.value = isMissingProfileError(errorMessage) ? 'missing' : 'error'
		toast.add({
			title: t('settings.remoteSync.toast.syncNowFailedTitle'),
			description: errorMessage,
			color: 'error',
		})
		logError('sync:now:error', errorMessage)
	}

	async function handleTestNew() {
		if (!canTestNew.value) return
		const validation = validateWithZod(postgresUrlSchema, newUrl.value)
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}
		try {
			log('test:new:start')
			testingNew.value = true
			status.value = 'testing'
			await tauriInvoke('test_neon_connection', { args: { databaseUrl: newUrl.value.trim() } })
			status.value = 'ok'
			toast.add({
				title: t('settings.remoteSync.toast.connectionOkTitle'),
				description: t('settings.remoteSync.toast.connectionOkDescription'),
				color: 'success',
			})
			log('test:new:done')
		} catch (error) {
			status.value = 'error'
			toast.add({
				title: t('settings.remoteSync.toast.connectionFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('test:new:error', error)
		} finally {
			testingNew.value = false
		}
	}

	async function handleCreateProfile() {
		if (!canSaveNew.value) return
		const validation = validateWithZod(remoteProfileSchema, { name: newName.value, url: newUrl.value })
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}
		try {
			log('create:start', { name: newName.value })
			savingNew.value = true
			await remoteSyncStore.addProfile({ name: newName.value.trim(), url: newUrl.value.trim() }, 'manual')
			newName.value = ''
			newUrl.value = ''
			createOpen.value = false
			status.value = 'missing'
			toast.add({
				title: t('settings.remoteSync.toast.createdProfileTitle'),
				description: t('settings.remoteSync.toast.createdProfileDescription'),
				color: 'success',
			})
			log('create:done')
		} catch (error) {
			toast.add({
				title: t('settings.remoteSync.toast.createFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('create:error', error)
		} finally {
			savingNew.value = false
		}
	}

	async function handleTestEdit() {
		if (!canTestEdit.value) return
		const validation = validateWithZod(postgresUrlSchema, editUrl.value)
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}
		if (!editProfileId.value) return
		try {
			log('test:edit:start', { profileId: editProfileId.value })
			testingEdit.value = true
			status.value = 'testing'
			await tauriInvoke('test_neon_connection', { args: { databaseUrl: editUrl.value.trim() } })
			await remoteSyncStore.setConnectionHealth({
				profileId: editProfileId.value,
				databaseUrl: editUrl.value.trim(),
				result: 'ok',
				errorDigest: null,
			})
			status.value = 'ok'
			toast.add({
				title: t('settings.remoteSync.toast.connectionOkTitle'),
				description: t('settings.remoteSync.toast.connectionOkDescription'),
				color: 'success',
			})
			log('test:edit:done')
		} catch (error) {
			await remoteSyncStore.setConnectionHealth({
				profileId: editProfileId.value,
				databaseUrl: editUrl.value.trim(),
				result: 'error',
				errorDigest: resolveErrorMessage(error, t),
			})
			status.value = 'error'
			toast.add({
				title: t('settings.remoteSync.toast.connectionFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('test:edit:error', error)
		} finally {
			testingEdit.value = false
		}
	}

	async function handleSaveEdit() {
		if (!editProfileId.value || !canSaveEdit.value) return
		const validation = validateWithZod(remoteProfileSchema, { name: editName.value, url: editUrl.value })
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}
		try {
			log('save:edit:start', { profileId: editProfileId.value })
			savingEdit.value = true
			await remoteSyncStore.updateProfileName(editProfileId.value, editName.value.trim())
			await remoteSyncStore.updateProfileUrl(editProfileId.value, editUrl.value.trim())
			editOpen.value = false
			await refreshStatusByActiveProfileCache()
			toast.add({
				title: t('settings.remoteSync.toast.savedProfileTitle'),
				description: t('settings.remoteSync.toast.savedProfileDescription'),
				color: 'success',
			})
			log('save:edit:done')
		} catch (error) {
			toast.add({
				title: t('settings.remoteSync.toast.saveFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('save:edit:error', error)
		} finally {
			savingEdit.value = false
		}
	}

	async function setActive(profileId: string) {
		log('setActive:start', { profileId })
		try {
			await remoteSyncStore.setActiveProfile(profileId)
			await refreshStatusByActiveProfileCache()
			log('setActive:done', { profileId })
		} catch (error) {
			toast.add({
				title: t('settings.remoteSync.toast.switchFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('setActive:error', error)
		}
	}

	function openDelete(profile: RemoteDbProfile) {
		log('open:delete', { profileId: profile.id })
		deleteTarget.value = profile
	}

	async function confirmDelete() {
		if (!deleteTarget.value) return
		try {
			log('delete:start', { profileId: deleteTarget.value.id })
			deleting.value = true
			await remoteSyncStore.removeProfile(deleteTarget.value.id)
			deleteTarget.value = null
			status.value = remoteSyncStore.activeProfileId ? status.value : 'missing'
			toast.add({ title: t('settings.remoteSync.toast.deletedProfileTitle'), color: 'success' })
			log('delete:done')
		} catch (error) {
			toast.add({
				title: t('settings.remoteSync.toast.deleteFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('delete:error', error)
		} finally {
			deleting.value = false
		}
	}

	async function handleImport() {
		importError.value = ''
		if (!canImport.value) return
		try {
			log('import:start')
			importing.value = true
			const parsed = JSON.parse(importText.value.trim())
			const validation = validateWithZod(remoteImportListSchema, parsed)
			if (!validation.ok) {
				importError.value = validation.message
				return
			}
			const items: RemoteDbProfileInput[] = validation.data.map((item) => ({
				name: item.name,
				url: item.url,
			}))
			await remoteSyncStore.importProfiles(items)
			importText.value = ''
			importOpen.value = false
			await refreshStatusByActiveProfileCache()
			toast.add({
				title: t('settings.remoteSync.toast.importedTitle'),
				description: t('settings.remoteSync.toast.importedDescription', { count: items.length }),
				color: 'success',
			})
			log('import:done', { count: items.length })
		} catch (error) {
			importError.value = t('settings.remoteSync.import.parseError')
			toast.add({
				title: t('settings.remoteSync.toast.importFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('import:error', error)
		} finally {
			importing.value = false
		}
	}

	const autoSyncIntervalMs = computed(() => Math.max(1, syncPreferences.value.intervalMinutes) * 60_000)
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

	onMounted(async () => {
		log('mount:load:start')
		try {
			await remoteSyncStore.load()
			await refreshStatusByActiveProfileCache()
			if (syncPreferences.value.enabled && syncPreferences.value.runOnAppStart) {
				void triggerAutoSync('appStart')
			}
			log('mount:load:done', { activeProfileId: remoteSyncStore.activeProfileId })
		} catch (error) {
			status.value = 'error'
			toast.add({
				title: t('settings.remoteSync.toast.readProfileFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('mount:load:error', error)
		}
	})

	return {
		isPushing,
		isPulling,
		isSyncingNow,
		isSyncing,
		syncError,
		hasActiveProfile,
		lastPushedText,
		lastPulledText,
		lastPushSummaryText,
		lastPullSummaryText,
		historyFilter,
		historyFilterOptions,
		isClearingHistory,
		recentSyncHistory,
		syncPreferences,
		autoSyncIntervalOptions,
		autoSyncRetryOptions,
		autoSyncStatusText,
		autoSyncMetaText,
		autoSyncLastError,
		online,
		setHistoryFilter,
		handleClearSyncHistory,
		handleSyncNow,
		handleUpdateAutoSyncEnabled,
		handleUpdateAutoSyncIntervalMinutes,
		handleUpdateAutoSyncRetryCount,
		handleUpdateAutoSyncRunOnAppStart,
		handleUpdateAutoSyncRunOnWindowFocus,
		handlePush,
		handlePull,
		profiles,
		activeProfileId,
		activeProfile,
		statusMessage,
		statusLabel,
		statusBadgeVariant,
		statusBadgeClass,
		testingCurrent,
		handleTestCurrent,
		openCreate,
		openImport,
		openEdit,
		setActive,
		openDelete,
		formatProfileMeta,
		createOpen,
		newName,
		newUrl,
		canSaveNew,
		canTestNew,
		testingNew,
		savingNew,
		handleTestNew,
		handleCreateProfile,
		editOpen,
		editName,
		editUrl,
		canSaveEdit,
		canTestEdit,
		testingEdit,
		savingEdit,
		handleTestEdit,
		handleSaveEdit,
		importOpen,
		importText,
		importError,
		canImport,
		importing,
		handleImport,
		deleteOpen,
		deleteTarget,
		deleting,
		confirmDelete,
	}
}
