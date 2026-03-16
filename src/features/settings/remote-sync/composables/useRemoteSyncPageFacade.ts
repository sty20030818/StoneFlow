import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAppContentMotionPreset, useInteractionMotionPresetWithDelay } from '@/composables/base/motion'
import { useRemoteSyncActions } from '@/composables/useRemoteSyncActions'
import { createModalLayerUi } from '@/config/ui-layer'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import { resolveErrorMessage } from '@/utils/error-message'

import { invalidateRemoteSyncQueries } from '../model'
import { useRemoteSyncHistoryQuery, useRemoteSyncProfilesQuery } from '../queries'
import { useRemoteSyncAutoSync } from './useRemoteSyncAutoSync'
import { useRemoteSyncHistoryPanel } from './useRemoteSyncHistoryPanel'
import { useRemoteSyncProfilesPanel } from './useRemoteSyncProfilesPanel'
import { useRemoteSyncStatus } from './useRemoteSyncStatus'
import { useRemoteSyncSyncPanel } from './useRemoteSyncSyncPanel'

export function useRemoteSyncPageFacade() {
	const remoteSyncStore = useRemoteSyncStore()
	const toast = useToast()
	const { t, locale } = useI18n({ useScope: 'global' })

	function log(...args: unknown[]) {
		// console.log('[settings-remote-sync]', ...args)
		void args
	}

	function logError(...args: unknown[]) {
		// console.error('[settings-remote-sync]', ...args)
		void args
	}

	const remoteSyncActions = useRemoteSyncActions()
	const profilesQuery = useRemoteSyncProfilesQuery()
	const historyQuery = useRemoteSyncHistoryQuery()

	async function refreshRemoteSyncQueries() {
		await invalidateRemoteSyncQueries()
	}

	const statusPanel = useRemoteSyncStatus({
		t,
		logError,
	})

	const profilesPanel = useRemoteSyncProfilesPanel({
		t,
		locale,
		profiles: profilesQuery.profiles,
		setStatus: statusPanel.setStatus,
		refreshStatusByActiveProfileCache: statusPanel.refreshStatusByActiveProfileCache,
		persistConnectionHealthSafely: statusPanel.persistConnectionHealthSafely,
		onProfilesMutated: refreshRemoteSyncQueries,
		log,
		logError,
	})

	const syncPanel = useRemoteSyncSyncPanel({
		t,
		locale,
		remoteSyncActions,
		testingNew: profilesPanel.testingNew,
		testingEdit: profilesPanel.testingEdit,
		setStatus: statusPanel.setStatus,
		setStatusByErrorMessage: statusPanel.setStatusByErrorMessage,
		isMissingProfileError: statusPanel.isMissingProfileError,
		persistConnectionHealthSafely: statusPanel.persistConnectionHealthSafely,
		log,
		logError,
	})

	const historyPanel = useRemoteSyncHistoryPanel({
		t,
		locale,
		lastPushedAt: syncPanel.lastPushedAt,
		lastPulledAt: syncPanel.lastPulledAt,
		lastPushReport: syncPanel.lastPushReport,
		lastPullReport: syncPanel.lastPullReport,
		syncHistory: historyQuery.syncHistory,
		onHistoryMutated: refreshRemoteSyncQueries,
		logError,
	})

	const autoSyncPanel = useRemoteSyncAutoSync({
		t,
		locale,
		isSyncing: syncPanel.isSyncing,
		isTestingAnyConnection: syncPanel.isTestingAnyConnection,
		runSyncNowSilently: syncPanel.runSyncNowSilently,
		logError,
	})

	onMounted(async () => {
		log('mount:load:start')
		try {
			await remoteSyncStore.load()
			await refreshRemoteSyncQueries()
			await statusPanel.refreshStatusByActiveProfileCache()
			if (autoSyncPanel.syncPreferences.value.enabled && autoSyncPanel.syncPreferences.value.runOnAppStart) {
				void autoSyncPanel.triggerAutoSync('appStart')
			}
			log('mount:load:done', { activeProfileId: remoteSyncStore.activeProfileId })
		} catch (error) {
			statusPanel.setStatus('error')
			toast.add({
				title: t('settings.remoteSync.toast.readProfileFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
			logError('mount:load:error', error)
		}
	})

	const remoteSyncModalUi = createModalLayerUi()
	const actionsCardMotion = useAppContentMotionPreset('drawerSection', 'sectionBase')
	const headerMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 16)
	const contentGridMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 30)
	const profilesCardMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 48)
	const modalBodyMotion = useInteractionMotionPresetWithDelay('modalSection', 24)
	const modalFooterMotion = useInteractionMotionPresetWithDelay('statusFeedback', 44)

	return {
		t,
		remoteSyncModalUi,
		actionsCardMotion,
		headerMotion,
		contentGridMotion,
		profilesCardMotion,
		modalBodyMotion,
		modalFooterMotion,
		...syncPanel,
		...statusPanel,
		...historyPanel,
		...profilesPanel,
		...autoSyncPanel,
	}
}
