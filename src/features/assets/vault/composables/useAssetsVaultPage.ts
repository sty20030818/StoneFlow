import { refDebounced, useAsyncState, useTimeoutFn } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useErrorHandler } from '@/composables/base/useErrorHandler'
import { useLoadErrorFeedback } from '@/composables/base/useLoadErrorFeedback'
import { validateWithZod } from '@/composables/base/zod'
import { vaultSubmitSchema } from '@/composables/domain/validation/forms'
import { ensureVaultUnlocked, exportVaultEntries, importVaultEntries } from '@/services/api/vault'

import type { AssetVaultEntry, AssetVaultEntryType } from '../model'
import { createAssetVaultEntry, deleteAssetVaultEntry, updateAssetVaultEntry } from '../mutations'
import { listAssetVaultEntries } from '../queries'
import { useAssetClipboardFeedback } from '../../shared/composables'

type VaultFilterOption = {
	label: string
	value: string
}

type VaultFavoriteFilter = 'all' | 'favorites' | 'unstarred'
type VaultSortOption = 'updated_desc' | 'created_desc' | 'name_asc'
const IMPORT_FILE_INPUT_ID = 'vault-import-file-input'

function createEmptyVaultEntry(): AssetVaultEntry {
	const now = Date.now()
	return {
		id: '',
		name: '',
		type: 'api_key',
		environment: 'prod',
		value: '',
		folder: null,
		note: null,
		tags: [],
		favorite: false,
		syncState: 'local',
		createdAt: now,
		updatedAt: now,
	}
}

export function useAssetsVaultPage() {
	const { t, locale } = useI18n({ useScope: 'global' })
	const { handleApiError, handleSuccess, handleValidationError } = useErrorHandler()
	const { copyWithFeedback } = useAssetClipboardFeedback()

	const selectedEntry = ref<AssetVaultEntry | null>(null)
	const editOpen = ref(false)
	const searchKeyword = ref('')
	const debouncedSearchKeyword = refDebounced(searchKeyword, 180)
	const selectedType = ref('all')
	const selectedEnvironment = ref('all')
	const selectedFavoriteFilter = ref<VaultFavoriteFilter>('all')
	const selectedSort = ref<VaultSortOption>('updated_desc')
	const loadError = ref<unknown | null>(null)
	const revealedEntryId = ref<string | null>(null)
	const showValue = ref(false)
	const unlocking = ref(false)
	const unlocked = ref(false)

	const exportOpen = ref(false)
	const exportPassword = ref('')
	const exportPasswordConfirm = ref('')
	const exporting = ref(false)

	const importOpen = ref(false)
	const importPassword = ref('')
	const importFileName = ref('')
	const importFileContent = ref('')
	const importing = ref(false)

	const {
		state: entries,
		isLoading: loading,
		execute: executeRefresh,
	} = useAsyncState(() => listAssetVaultEntries(), [] as AssetVaultEntry[], {
		immediate: false,
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
		loading: computed(() => loading.value || unlocking.value),
		toastTitle: computed(() => t('assets.vault.toast.loadFailedTitle')),
	})

	const canExport = computed(() => {
		return (
			exportPassword.value.trim().length > 0
			&& exportPasswordConfirm.value.trim().length > 0
			&& exportPassword.value === exportPasswordConfirm.value
		)
	})

	const canImport = computed(() => {
		return importPassword.value.trim().length > 0 && importFileContent.value.trim().length > 0
	})

	const { start: hideCardValueLater, stop: stopCardHideTimer } = useTimeoutFn(() => {
		revealedEntryId.value = null
	}, 2400, { immediate: false })

	const { start: hideModalValueLater, stop: stopModalHideTimer } = useTimeoutFn(() => {
		showValue.value = false
	}, 3200, { immediate: false })

	const editForm = ref({
		name: '',
		type: 'api_key' as AssetVaultEntryType,
		environment: '',
		value: '',
		folder: '',
		note: '',
		tags: [] as string[],
		favorite: false,
	})
	const tagsInput = ref('')

	const typeOptions = computed<VaultFilterOption[]>(() => [
		{ label: t('assets.vault.types.apiKey'), value: 'api_key' },
		{ label: t('assets.vault.types.token'), value: 'token' },
		{ label: t('assets.vault.types.password'), value: 'password' },
		{ label: t('assets.vault.types.config'), value: 'config' },
	])

	const typeFilterOptions = computed<VaultFilterOption[]>(() => [
		{ label: t('assets.vault.filters.allTypes'), value: 'all' },
		...typeOptions.value,
	])

	const environmentOptions = computed<VaultFilterOption[]>(() => {
		const items = new Set<string>()
		for (const entry of entries.value) {
			if (entry.environment?.trim()) {
				items.add(entry.environment.trim())
			}
		}

		return [
			{ label: t('assets.vault.filters.allEnvironments'), value: 'all' },
			...Array.from(items)
				.sort((left, right) => left.localeCompare(right))
				.map((environment) => ({
					label: environment,
					value: environment,
				})),
		]
	})

	const favoriteOptions = computed<VaultFilterOption[]>(() => [
		{ label: t('assets.vault.filters.favoriteAll'), value: 'all' },
		{ label: t('assets.vault.filters.favoriteOnly'), value: 'favorites' },
		{ label: t('assets.vault.filters.favoriteOff'), value: 'unstarred' },
	])

	const sortOptions = computed<VaultFilterOption[]>(() => [
		{ label: t('assets.vault.filters.sortUpdated'), value: 'updated_desc' },
		{ label: t('assets.vault.filters.sortCreated'), value: 'created_desc' },
		{ label: t('assets.vault.filters.sortName'), value: 'name_asc' },
	])

	const hasActiveFilters = computed(() => {
		return (
			selectedType.value !== 'all'
			|| selectedEnvironment.value !== 'all'
			|| selectedFavoriteFilter.value !== 'all'
			|| selectedSort.value !== 'updated_desc'
			|| debouncedSearchKeyword.value.trim().length > 0
		)
	})

	const favoriteCount = computed(() => entries.value.filter((entry) => entry.favorite).length)

	const filteredEntries = computed(() => {
		const keyword = debouncedSearchKeyword.value.trim().toLowerCase()

		return [...entries.value]
			.filter((entry) => {
				if (selectedType.value !== 'all' && entry.type !== selectedType.value) {
					return false
				}

				if (selectedEnvironment.value !== 'all' && entry.environment !== selectedEnvironment.value) {
					return false
				}

				if (selectedFavoriteFilter.value === 'favorites' && !entry.favorite) {
					return false
				}

				if (selectedFavoriteFilter.value === 'unstarred' && entry.favorite) {
					return false
				}

				if (!keyword) return true

				return [
					entry.name,
					entry.type,
					entry.environment ?? '',
					entry.folder ?? '',
					entry.note ?? '',
					entry.tags.join(' '),
				].some((field) => field.toLowerCase().includes(keyword))
			})
			.sort((left, right) => {
				if (selectedSort.value === 'created_desc') {
					return right.createdAt - left.createdAt
				}

				if (selectedSort.value === 'name_asc') {
					return left.name.localeCompare(right.name)
				}

				return right.updatedAt - left.updatedAt
			})
	})

	function typeLabel(type: AssetVaultEntryType): string {
		const found = typeOptions.value.find((option) => option.value === type)
		return found?.label ?? type
	}

	function maskValue(value: string) {
		if (!value.trim()) return '••••••'
		if (value.length <= 6) return '•'.repeat(value.length)
		return `${'•'.repeat(Math.max(value.length - 4, 6))}${value.slice(-4)}`
	}

	function formatEntryDate(timestamp: number) {
		return new Intl.DateTimeFormat(locale.value, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		}).format(timestamp)
	}

	function onTagsBlur() {
		editForm.value.tags = tagsInput.value
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean)
	}

	function openEditor(entry: AssetVaultEntry) {
		selectedEntry.value = entry
		editForm.value = {
			name: entry.name,
			type: entry.type,
			environment: entry.environment ?? '',
			value: entry.value,
			folder: entry.folder ?? '',
			note: entry.note ?? '',
			tags: [...entry.tags],
			favorite: entry.favorite,
		}
		tagsInput.value = entry.tags.join(', ')
		showValue.value = false
		editOpen.value = true
	}

	function onCreateNew() {
		openEditor(createEmptyVaultEntry())
	}

	function closeEditor() {
		editOpen.value = false
		selectedEntry.value = null
		showValue.value = false
		revealedEntryId.value = null
		stopCardHideTimer()
		stopModalHideTimer()
	}

	function resetFilters() {
		searchKeyword.value = ''
		selectedType.value = 'all'
		selectedEnvironment.value = 'all'
		selectedFavoriteFilter.value = 'all'
		selectedSort.value = 'updated_desc'
	}

	function isEntryRevealed(entry: AssetVaultEntry) {
		return revealedEntryId.value === entry.id
	}

	function toggleEntryReveal(entry: AssetVaultEntry) {
		if (revealedEntryId.value === entry.id) {
			revealedEntryId.value = null
			stopCardHideTimer()
			return
		}

		revealedEntryId.value = entry.id
		stopCardHideTimer()
		hideCardValueLater()
	}

	function toggleSensitiveValue() {
		showValue.value = !showValue.value

		if (!showValue.value) {
			stopModalHideTimer()
			return
		}

		stopModalHideTimer()
		hideModalValueLater()
	}

	async function ensureUnlocked() {
		if (unlocked.value) return

		try {
			unlocking.value = true
			await ensureVaultUnlocked()
			unlocked.value = true
			loadError.value = null
		} catch (error) {
			loadError.value = error
			throw error
		} finally {
			unlocking.value = false
		}
	}

	async function refresh() {
		await ensureUnlocked()
		await executeRefresh(0)
	}

	async function onCopyEntry(entry: AssetVaultEntry) {
		await copyWithFeedback(entry.value, {
			successTitle: t('assets.vault.toast.copiedTitle'),
			emptyTitle: t('assets.vault.toast.noCopyValueTitle'),
			errorTitle: t('assets.vault.toast.copyFailedTitle'),
		})
	}

	async function onCopyDraft() {
		await copyWithFeedback(editForm.value.value, {
			successTitle: t('assets.vault.toast.copiedTitle'),
			emptyTitle: t('assets.vault.toast.noCopyValueTitle'),
			errorTitle: t('assets.vault.toast.copyFailedTitle'),
		})
		stopModalHideTimer()
		hideModalValueLater()
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
			onTagsBlur()
			const payload = {
				name: editForm.value.name.trim(),
				type: editForm.value.type,
				environment: editForm.value.environment.trim() || null,
				value: editForm.value.value,
				folder: editForm.value.folder.trim() || null,
				note: editForm.value.note.trim() || null,
				tags: [...editForm.value.tags],
				favorite: editForm.value.favorite,
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

	async function onToggleFavorite(entry: AssetVaultEntry) {
		try {
			await updateAssetVaultEntry(entry.id, {
				favorite: !entry.favorite,
			})
			handleSuccess(
				entry.favorite
					? t('assets.vault.toast.favoriteRemovedTitle')
					: t('assets.vault.toast.favoriteAddedTitle'),
			)
			await refresh()
		} catch (error) {
			handleApiError(error, {
				title: t('assets.common.toast.saveFailedTitle'),
			})
		}
	}

	function resetExportForm() {
		exportPassword.value = ''
		exportPasswordConfirm.value = ''
	}

	function openExportModal() {
		resetExportForm()
		exportOpen.value = true
	}

	function closeExportModal() {
		exportOpen.value = false
		resetExportForm()
	}

	function resetImportForm() {
		importPassword.value = ''
		importFileName.value = ''
		importFileContent.value = ''
		const input = document.getElementById(IMPORT_FILE_INPUT_ID) as HTMLInputElement | null
		if (input) input.value = ''
	}

	function openImportModal() {
		resetImportForm()
		importOpen.value = true
	}

	function closeImportModal() {
		importOpen.value = false
		resetImportForm()
	}

	function triggerImportFilePick() {
		const input = document.getElementById(IMPORT_FILE_INPUT_ID) as HTMLInputElement | null
		input?.click()
	}

	async function onImportFileChange(event: Event) {
		const target = event.target as HTMLInputElement | null
		const file = target?.files?.[0]
		if (!file) return

		importFileName.value = file.name
		importFileContent.value = await file.text()
	}

	function downloadExportBundle(content: string) {
		const stamp = new Date().toISOString().slice(0, 10)
		const blob = new Blob([content], {
			type: 'application/json;charset=utf-8',
		})
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = `stoneflow-vault-${stamp}.json`
		link.click()
		window.URL.revokeObjectURL(url)
	}

	async function onExportVault() {
		if (!canExport.value) {
			handleValidationError(t('assets.vault.toast.exportPasswordMismatchTitle'))
			return
		}

		try {
			exporting.value = true
			const content = await exportVaultEntries(exportPassword.value)
			downloadExportBundle(content)
			handleSuccess(t('assets.vault.toast.exportedTitle'))
			closeExportModal()
		} catch (error) {
			handleApiError(error, {
				title: t('assets.vault.toast.exportFailedTitle'),
			})
		} finally {
			exporting.value = false
		}
	}

	async function onImportVault() {
		if (!canImport.value) {
			handleValidationError(t('assets.vault.toast.importMissingFileTitle'))
			return
		}

		try {
			importing.value = true
			const count = await importVaultEntries(importFileContent.value, importPassword.value)
			handleSuccess({
				title: t('assets.vault.toast.importedTitle'),
				description: t('assets.vault.toast.importedDescription', { count }),
			})
			await refresh()
			closeImportModal()
		} catch (error) {
			handleApiError(error, {
				title: t('assets.vault.toast.importFailedTitle'),
			})
		} finally {
			importing.value = false
		}
	}

	void refresh()

	return {
		t,
		loading,
		unlocking,
		unlocked,
		loadErrorMessage,
		showLoadErrorState,
		entries,
		selectedEntry,
		editOpen,
		searchKeyword,
		selectedType,
		selectedEnvironment,
		selectedFavoriteFilter,
		selectedSort,
		revealedEntryId,
		showValue,
		editForm,
		tagsInput,
		exportOpen,
		exportPassword,
		exportPasswordConfirm,
		exporting,
		importOpen,
		importPassword,
		importFileName,
		importFileContent,
		importing,
		canExport,
		canImport,
		typeOptions,
		typeFilterOptions,
		environmentOptions,
		favoriteOptions,
		sortOptions,
		hasActiveFilters,
		favoriteCount,
		filteredEntries,
		typeLabel,
		maskValue,
		formatEntryDate,
		onTagsBlur,
		openEditor,
		onCreateNew,
		closeEditor,
		resetFilters,
		isEntryRevealed,
		toggleEntryReveal,
		toggleSensitiveValue,
		refresh,
		onCopyEntry,
		onCopyDraft,
		onSave,
		onDelete,
		onToggleFavorite,
		openExportModal,
		closeExportModal,
		openImportModal,
		closeImportModal,
		triggerImportFilePick,
		onImportFileChange,
		onExportVault,
		onImportVault,
	}
}
