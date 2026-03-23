import { refDebounced, useAsyncState, useClipboard, useTimeoutFn } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useErrorHandler } from '@/composables/base/useErrorHandler'
import { useLoadErrorFeedback } from '@/composables/base/useLoadErrorFeedback'
import { validateWithZod } from '@/composables/base/zod'
import { vaultSubmitSchema } from '@/composables/domain/validation/forms'

import type { AssetVaultEntry, AssetVaultEntryType } from '../model'
import { createAssetVaultEntry, deleteAssetVaultEntry, updateAssetVaultEntry } from '../mutations'
import { listAssetVaultEntries } from '../queries'

export function useAssetsVaultPage() {
	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })
	const { handleApiError, handleSuccess, handleValidationError } = useErrorHandler()

	const selectedEntry = ref<AssetVaultEntry | null>(null)
	const editOpen = ref(false)
	const selectedFolder = ref<string | null>(null)
	const searchKeyword = ref('')
	const debouncedSearchKeyword = refDebounced(searchKeyword, 180)
	const loadError = ref<unknown | null>(null)
	const {
		state: entries,
		isLoading: loading,
		execute: executeRefresh,
	} = useAsyncState(() => listAssetVaultEntries(), [] as AssetVaultEntry[], {
		immediate: true,
		resetOnExecute: false,
		onSuccess: () => {
			loadError.value = null
		},
		onError: (error) => {
			loadError.value = error
		},
	})
	const { loadErrorMessage, showLoadErrorState } = useLoadErrorFeedback({
		error: loadError,
		hasData: computed(() => entries.value.length > 0),
		loading,
		toastTitle: computed(() => t('assets.vault.toast.loadFailedTitle')),
	})

	const showValue = ref(false)
	const { copy } = useClipboard()
	const { start: hideValueLater, stop: stopHideValueTimer } = useTimeoutFn(
		() => {
			showValue.value = false
		},
		2000,
		{ immediate: false },
	)

	const editForm = ref({
		name: '',
		type: 'api_key' as AssetVaultEntryType,
		value: '',
		folder: '',
		note: '',
	})

	const typeOptions = computed(() => [
		{ label: t('assets.vault.types.apiKey'), value: 'api_key' },
		{ label: t('assets.vault.types.token'), value: 'token' },
		{ label: t('assets.vault.types.password'), value: 'password' },
		{ label: t('assets.vault.types.config'), value: 'config' },
	])

	function typeLabel(type: AssetVaultEntryType): string {
		const found = typeOptions.value.find((option) => option.value === type)
		return found?.label ?? type
	}

	const folders = computed(() => {
		const set = new Set<string>()
		for (const entry of entries.value) {
			if (entry.folder) set.add(entry.folder)
		}
		return Array.from(set).sort()
	})

	const filteredEntries = computed(() => {
		let result = entries.value

		if (selectedFolder.value !== null) {
			result = result.filter((entry) => entry.folder === selectedFolder.value)
		}

		if (debouncedSearchKeyword.value.trim()) {
			const keyword = debouncedSearchKeyword.value.trim().toLowerCase()
			result = result.filter((entry) => {
				if (entry.name.toLowerCase().includes(keyword)) return true
				if (entry.folder && entry.folder.toLowerCase().includes(keyword)) return true
				return false
			})
		}

		return result.sort((a, b) => b.updatedAt - a.updatedAt)
	})

	function openEditor(entry: AssetVaultEntry) {
		selectedEntry.value = entry
		editForm.value = {
			name: entry.name,
			type: entry.type,
			value: entry.value,
			folder: entry.folder ?? '',
			note: entry.note ?? '',
		}
		showValue.value = false
		editOpen.value = true
	}

	function onCreateNew() {
		openEditor({
			id: '',
			name: '',
			type: 'api_key',
			environment: null,
			value: '',
			folder: null,
			note: null,
			tags: [],
			favorite: false,
			syncState: 'local',
			createdAt: Date.now(),
			updatedAt: Date.now(),
		})
	}

	function closeEditor() {
		editOpen.value = false
		selectedEntry.value = null
		showValue.value = false
		stopHideValueTimer()
	}

	async function onCopy() {
		if (!editForm.value.value) {
			toast.add({ title: t('assets.vault.toast.noCopyValueTitle'), color: 'neutral' })
			return
		}
		try {
			await copy(editForm.value.value)
			handleSuccess(t('assets.vault.toast.copiedTitle'))
			stopHideValueTimer()
			hideValueLater()
		} catch (error) {
			handleApiError(error, {
				title: t('assets.vault.toast.copyFailedTitle'),
			})
		}
	}

	async function onSave() {
		if (!selectedEntry.value) return
		const validation = validateWithZod(vaultSubmitSchema, {
			name: editForm.value.name,
			value: editForm.value.value,
		})
		if (!validation.ok) {
			handleValidationError(validation.message)
			return
		}

		try {
			const payload = {
				...editForm.value,
				folder: editForm.value.folder.trim() || null,
				note: editForm.value.note.trim() || null,
			}
			if (selectedEntry.value.id) {
				await updateAssetVaultEntry(selectedEntry.value.id, payload)
				handleSuccess(t('assets.common.toast.savedTitle'))
			} else {
				await createAssetVaultEntry(payload)
				handleSuccess(t('assets.common.toast.createdTitle'))
			}
			await refresh()
			closeEditor()
		} catch (error) {
			handleApiError(error, {
				title: t('assets.common.toast.saveFailedTitle'),
			})
		}
	}

	async function onDelete(id: string) {
		try {
			await deleteAssetVaultEntry(id)
			handleSuccess(t('assets.common.toast.deletedTitle'))
			if (selectedEntry.value?.id === id) {
				closeEditor()
			}
			await refresh()
		} catch (error) {
			handleApiError(error, {
				title: t('assets.common.toast.deleteFailedTitle'),
			})
		}
	}

	async function refresh() {
		await executeRefresh(0)
	}

	return {
		t,
		loading,
		loadErrorMessage,
		showLoadErrorState,
		selectedEntry,
		editOpen,
		selectedFolder,
		searchKeyword,
		showValue,
		editForm,
		typeOptions,
		folders,
		filteredEntries,
		typeLabel,
		refresh,
		openEditor,
		onCreateNew,
		closeEditor,
		onCopy,
		onSave,
		onDelete,
	}
}
