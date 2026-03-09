import { computed, ref, type Ref } from 'vue'

import { validateWithZod } from '@/composables/base/zod'
import { postgresUrlSchema, remoteImportListSchema, remoteProfileSchema } from '@/composables/domain/validation/forms'
import { tauriInvoke } from '@/services/tauri/invoke'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import type { RemoteDbProfile, RemoteDbProfileInput } from '@/types/shared/remote-sync'
import { resolveErrorMessage } from '@/utils/error-message'
import { formatDateTime } from '@/utils/time'

type Translate = (key: string, params?: Record<string, unknown>) => string

type Logger = (...args: unknown[]) => void

export function useRemoteSyncProfilesPanel(options: {
	t: Translate
	locale: Ref<string>
	profiles: Ref<RemoteDbProfile[]>
	setStatus: (status: 'missing' | 'ok' | 'error' | 'testing' | 'syncing') => void
	refreshStatusByActiveProfileCache: () => Promise<void>
	persistConnectionHealthSafely: (
		input: Parameters<ReturnType<typeof useRemoteSyncStore>['setConnectionHealth']>[0],
		logTag: string,
	) => Promise<void>
	onProfilesMutated: () => Promise<void>
	log: Logger
	logError: Logger
}) {
	const {
		t,
		locale,
		profiles,
		setStatus,
		refreshStatusByActiveProfileCache,
		persistConnectionHealthSafely,
		onProfilesMutated,
		log,
		logError,
	} = options
	const remoteSyncStore = useRemoteSyncStore()
	const toast = useToast()

	const activeProfileId = computed(() => remoteSyncStore.activeProfileId)
	const activeProfile = computed(() => remoteSyncStore.activeProfile)

	const createOpen = ref(false)
	const importOpen = ref(false)
	const editProfileId = ref<string | null>(null)
	const editOpen = computed({
		get: () => !!editProfileId.value,
		set: (value) => {
			if (!value) editProfileId.value = null
		},
	})

	const newName = ref('')
	const newUrl = ref('')
	const editName = ref('')
	const editUrl = ref('')
	const importText = ref('')
	const importError = ref('')

	const testingNew = ref(false)
	const testingEdit = ref(false)
	const savingNew = ref(false)
	const savingEdit = ref(false)
	const importing = ref(false)
	const deleting = ref(false)
	const deleteTarget = ref<RemoteDbProfile | null>(null)

	const canSaveNew = computed(() => validateWithZod(remoteProfileSchema, { name: newName.value, url: newUrl.value }).ok)
	const canTestNew = computed(() => validateWithZod(postgresUrlSchema, newUrl.value).ok)
	const canSaveEdit = computed(
		() => validateWithZod(remoteProfileSchema, { name: editName.value, url: editUrl.value }).ok,
	)
	const canTestEdit = computed(() => validateWithZod(postgresUrlSchema, editUrl.value).ok)
	const canImport = computed(() => importText.value.trim().length > 0)

	const deleteOpen = computed({
		get: () => !!deleteTarget.value,
		set: (value) => {
			if (!value) deleteTarget.value = null
		},
	})

	function formatProfileMeta(profile: RemoteDbProfile) {
		const source =
			profile.source === 'import'
				? t('settings.remoteSync.profile.source.import')
				: t('settings.remoteSync.profile.source.manual')
		return `${source} · ${formatDateTime(profile.updatedAt, { locale: locale.value })}`
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

	function openDelete(profile: RemoteDbProfile) {
		log('open:delete', { profileId: profile.id })
		deleteTarget.value = profile
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
			setStatus('testing')
			await tauriInvoke('test_neon_connection', { args: { databaseUrl: newUrl.value.trim() } })
			setStatus('ok')
			toast.add({
				title: t('settings.remoteSync.toast.connectionOkTitle'),
				description: t('settings.remoteSync.toast.connectionOkDescription'),
				color: 'success',
			})
			log('test:new:done')
		} catch (error) {
			setStatus('error')
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
			await onProfilesMutated()
			newName.value = ''
			newUrl.value = ''
			createOpen.value = false
			setStatus('missing')
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
			setStatus('testing')
			await tauriInvoke('test_neon_connection', { args: { databaseUrl: editUrl.value.trim() } })
			await persistConnectionHealthSafely(
				{
					profileId: editProfileId.value,
					databaseUrl: editUrl.value.trim(),
					result: 'ok',
					errorDigest: null,
				},
				'test:edit:cache:ok:error',
			)
			setStatus('ok')
			toast.add({
				title: t('settings.remoteSync.toast.connectionOkTitle'),
				description: t('settings.remoteSync.toast.connectionOkDescription'),
				color: 'success',
			})
			log('test:edit:done')
		} catch (error) {
			await persistConnectionHealthSafely(
				{
					profileId: editProfileId.value,
					databaseUrl: editUrl.value.trim(),
					result: 'error',
					errorDigest: resolveErrorMessage(error, t),
				},
				'test:edit:cache:error',
			)
			setStatus('error')
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
			await onProfilesMutated()
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
			await onProfilesMutated()
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

	async function confirmDelete() {
		if (!deleteTarget.value) return
		try {
			log('delete:start', { profileId: deleteTarget.value.id })
			deleting.value = true
			await remoteSyncStore.removeProfile(deleteTarget.value.id)
			await onProfilesMutated()
			deleteTarget.value = null
			setStatus(remoteSyncStore.activeProfileId ? 'ok' : 'missing')
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
			await onProfilesMutated()
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

	return {
		profiles,
		activeProfileId,
		activeProfile,
		formatProfileMeta,
		openCreate,
		openImport,
		openEdit,
		setActive,
		openDelete,
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
