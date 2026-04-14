import { computed, ref } from 'vue'

import { useRemoteSyncStore } from '../store'

export type RemoteSyncPageStatus = 'missing' | 'ok' | 'error' | 'testing' | 'syncing'

type Translate = (key: string, params?: Record<string, unknown>) => string

type Logger = (...args: unknown[]) => void

export function useRemoteSyncStatus(options: { t: Translate; logError: Logger }) {
	const { t, logError } = options
	const remoteSyncStore = useRemoteSyncStore()
	const status = ref<RemoteSyncPageStatus>('missing')

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

	function setStatus(nextStatus: RemoteSyncPageStatus) {
		status.value = nextStatus
	}

	function isMissingProfileError(message: string | null) {
		if (!message) return false
		return (
			message === t('settings.remoteSync.errors.noActiveProfile') ||
			message === t('settings.remoteSync.errors.noDatabaseUrl')
		)
	}

	function setStatusByErrorMessage(message: string | null) {
		status.value = isMissingProfileError(message) ? 'missing' : 'error'
	}

	async function persistConnectionHealthSafely(
		input: Parameters<typeof remoteSyncStore.setConnectionHealth>[0],
		logTag: string,
	) {
		try {
			await remoteSyncStore.setConnectionHealth(input)
		} catch (error) {
			logError(logTag, error)
		}
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

	return {
		status,
		statusMessage,
		statusLabel,
		statusBadgeVariant,
		statusBadgeClass,
		setStatus,
		isMissingProfileError,
		setStatusByErrorMessage,
		persistConnectionHealthSafely,
		refreshStatusByActiveProfileCache,
	}
}
