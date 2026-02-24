import { useI18n } from 'vue-i18n'
import { useNow } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'

import { useRemoteSyncActions } from '@/composables/useRemoteSyncActions'
import { validateWithZod } from '@/composables/base/zod'
import { postgresUrlSchema, remoteImportListSchema, remoteProfileSchema } from '@/composables/domain/validation/forms'
import { tauriInvoke } from '@/services/tauri/invoke'
import { useRefreshSignalsStore } from '@/stores/refresh-signals'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import type {
	RemoteDbProfile,
	RemoteDbProfileInput,
	RemoteSyncDirection,
	RemoteSyncHistoryItem,
} from '@/types/shared/remote-sync'
import {
	type RemoteSyncTableViewItem,
	summarizeRemoteSyncReport,
	toRemoteSyncTableViewItems,
} from '@/utils/remote-sync-report'

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
		syncError,
		lastPushedAt,
		lastPulledAt,
		syncHistory,
		lastPushReport,
		lastPullReport,
		hasActiveProfile,
		pushToRemote,
		pullFromRemote,
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

	const deleting = ref(false)
	const deleteTarget = ref<RemoteDbProfile | null>(null)

	const profiles = computed(() => remoteSyncStore.profiles)
	const activeProfileId = computed(() => remoteSyncStore.activeProfileId)
	const activeProfile = computed(() => remoteSyncStore.activeProfile)

	const status = ref<'missing' | 'ok' | 'error' | 'testing'>('missing')
	const statusMessage = computed(() => {
		switch (status.value) {
			case 'ok':
				return t('settings.remoteSync.status.message.ok')
			case 'error':
				return t('settings.remoteSync.status.message.error')
			case 'testing':
				return t('settings.remoteSync.status.message.testing')
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
			default:
				return t('settings.remoteSync.status.label.missing')
		}
	})

	const statusBadgeVariant = computed(() => (status.value === 'ok' ? 'soft' : 'outline'))
	const statusBadgeClass = computed(() => {
		switch (status.value) {
			case 'ok':
				return 'bg-primary/10 text-primary'
			case 'error':
				return 'bg-error/10 text-error'
			case 'testing':
				return 'bg-amber-500/10 text-amber-600'
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
		summarizeRemoteSyncReport(lastPushReport.value, t('settings.remoteSync.history.noPushStats')),
	)
	const lastPullSummaryText = computed(() =>
		summarizeRemoteSyncReport(lastPullReport.value, t('settings.remoteSync.history.noPullStats')),
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
		const date = new Date(timestamp)
		if (!Number.isFinite(date.getTime())) return fallback
		void now.value
		try {
			return formatDistanceToNow(date, {
				addSuffix: true,
				locale: locale.value.startsWith('en') ? enUS : zhCN,
			})
		} catch {
			return fallback
		}
	}

	function formatProfileMeta(profile: RemoteDbProfile) {
		const source =
			profile.source === 'import'
				? t('settings.remoteSync.profile.source.import')
				: t('settings.remoteSync.profile.source.manual')
		return `${source} · ${new Date(profile.updatedAt).toLocaleString(locale.value)}`
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
			syncedAtText: new Date(item.syncedAt).toLocaleString(locale.value),
			summary: summarizeRemoteSyncReport(item.report, t('settings.remoteSync.history.noStats')),
			tables: toRemoteSyncTableViewItems(item.report),
		}
	}

	function setHistoryFilter(filter: RemoteSyncHistoryFilter) {
		historyFilter.value = filter
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
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
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
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
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
			status.value = 'ok'
			toast.add({
				title: t('settings.remoteSync.toast.connectionOkTitle'),
				description: t('settings.remoteSync.toast.connectionOkDescription'),
				color: 'success',
			})
			log('test:current:done')
		} catch (error) {
			status.value = 'error'
			toast.add({
				title: t('settings.remoteSync.toast.connectionFailedTitle'),
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
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
		if (status.value === 'missing') {
			toast.add({ title: t('settings.remoteSync.toast.configureAndTestFirst'), color: 'neutral' })
			return
		}
		if (status.value === 'error') {
			toast.add({ title: t('settings.remoteSync.toast.statusErrorTestFirst'), color: 'warning' })
			return
		}
		try {
			log('sync:push:start', { profileId: activeProfileId.value })
			const report = await pushToRemote()
			if (!report) {
				toast.add({ title: t('settings.remoteSync.toast.syncInProgressTitle'), color: 'neutral' })
				return
			}
			status.value = 'ok'
			toast.add({
				title: t('settings.remoteSync.toast.pushSuccessTitle'),
				description: t('settings.remoteSync.toast.syncAtDescription', {
					time: new Date(report.syncedAt).toLocaleString(locale.value),
					summary: summarizeRemoteSyncReport(report, ''),
				}),
				color: 'success',
			})
			log('sync:push:done', { syncedAt: report.syncedAt })
		} catch (error) {
			toast.add({
				title: t('settings.remoteSync.toast.pushFailedTitle'),
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
				color: 'error',
			})
			logError('sync:push:error', error)
		}
	}

	async function handlePull() {
		if (testingCurrent.value || testingNew.value || testingEdit.value) {
			toast.add({ title: t('settings.remoteSync.toast.waitTestingBeforePull'), color: 'neutral' })
			return
		}
		if (status.value === 'missing') {
			toast.add({ title: t('settings.remoteSync.toast.configureAndTestFirst'), color: 'neutral' })
			return
		}
		if (status.value === 'error') {
			toast.add({ title: t('settings.remoteSync.toast.statusErrorTestFirst'), color: 'warning' })
			return
		}
		try {
			log('sync:pull:start', { profileId: activeProfileId.value })
			const report = await pullFromRemote()
			if (!report) {
				toast.add({ title: t('settings.remoteSync.toast.syncInProgressTitle'), color: 'neutral' })
				return
			}
			refreshSignals.bumpProject()
			status.value = 'ok'
			toast.add({
				title: t('settings.remoteSync.toast.pullSuccessTitle'),
				description: t('settings.remoteSync.toast.syncAtDescription', {
					time: new Date(report.syncedAt).toLocaleString(locale.value),
					summary: summarizeRemoteSyncReport(report, ''),
				}),
				color: 'success',
			})
			log('sync:pull:done', { syncedAt: report.syncedAt })
		} catch (error) {
			toast.add({
				title: t('settings.remoteSync.toast.pullFailedTitle'),
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
				color: 'error',
			})
			logError('sync:pull:error', error)
		}
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
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
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
			status.value = 'ok'
			toast.add({
				title: t('settings.remoteSync.toast.createdProfileTitle'),
				description: t('settings.remoteSync.toast.createdProfileDescription'),
				color: 'success',
			})
			log('create:done')
		} catch (error) {
			toast.add({
				title: t('settings.remoteSync.toast.createFailedTitle'),
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
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
		try {
			log('test:edit:start', { profileId: editProfileId.value })
			testingEdit.value = true
			status.value = 'testing'
			await tauriInvoke('test_neon_connection', { args: { databaseUrl: editUrl.value.trim() } })
			status.value = 'ok'
			toast.add({
				title: t('settings.remoteSync.toast.connectionOkTitle'),
				description: t('settings.remoteSync.toast.connectionOkDescription'),
				color: 'success',
			})
			log('test:edit:done')
		} catch (error) {
			status.value = 'error'
			toast.add({
				title: t('settings.remoteSync.toast.connectionFailedTitle'),
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
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
			status.value = 'ok'
			toast.add({
				title: t('settings.remoteSync.toast.savedProfileTitle'),
				description: t('settings.remoteSync.toast.savedProfileDescription'),
				color: 'success',
			})
			log('save:edit:done')
		} catch (error) {
			toast.add({
				title: t('settings.remoteSync.toast.saveFailedTitle'),
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
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
			status.value = 'missing'
			log('setActive:done', { profileId })
		} catch (error) {
			toast.add({
				title: t('settings.remoteSync.toast.switchFailedTitle'),
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
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
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
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
			status.value = 'ok'
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
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
				color: 'error',
			})
			logError('import:error', error)
		} finally {
			importing.value = false
		}
	}

	onMounted(async () => {
		log('mount:load:start')
		try {
			await remoteSyncStore.load()
			status.value = 'missing'
			log('mount:load:done', { activeProfileId: remoteSyncStore.activeProfileId })
		} catch (error) {
			status.value = 'error'
			toast.add({
				title: t('settings.remoteSync.toast.readProfileFailedTitle'),
				description: error instanceof Error ? error.message : t('fallback.unknownError'),
				color: 'error',
			})
			logError('mount:load:error', error)
		}
	})

	return {
		isPushing,
		isPulling,
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
		setHistoryFilter,
		handleClearSyncHistory,
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
