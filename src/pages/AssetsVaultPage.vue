<template>
	<section class="vault-library-page">
		<AssetLibraryToolbar
			v-motion="toolbarMotion"
			v-model:search="searchKeyword"
			:title="t('assets.vault.title')"
			:description="t('assets.vault.subtitle')"
			:search-placeholder="t('assets.vault.searchPlaceholder')">
			<template #eyebrow>
				<UIcon
					name="i-lucide-shield-keyhole"
					class="size-4" />
				<span>{{ t('assets.vault.labels.repository') }}</span>
			</template>

			<template #actions>
				<UBadge
					color="neutral"
					variant="soft"
					size="sm">
					{{ filteredEntries.length }} {{ t('assets.vault.labels.items') }}
				</UBadge>
				<UBadge
					color="warning"
					variant="soft"
					size="sm">
					{{ favoriteCount }} {{ t('assets.vault.labels.favorites') }}
				</UBadge>
				<UButton
					color="neutral"
					variant="soft"
					size="sm"
					icon="i-lucide-download"
					@click="openExportModal">
					{{ t('common.actions.export') }}
				</UButton>
				<UButton
					color="neutral"
					variant="soft"
					size="sm"
					icon="i-lucide-upload"
					@click="openImportModal">
					{{ t('common.actions.import') }}
				</UButton>
				<UButton
					v-if="hasActiveFilters"
					color="neutral"
					variant="ghost"
					size="sm"
					icon="i-lucide-filter-x"
					@click="resetFilters">
					{{ t('assets.vault.actions.clearFilters') }}
				</UButton>
				<UButton
					color="primary"
					size="sm"
					icon="i-lucide-plus"
					@click="onCreateNew">
					{{ t('common.actions.new') }}
				</UButton>
			</template>

			<template #filters>
				<USelectMenu
					v-model="selectedType"
					:items="typeFilterOptions"
					value-key="value"
					label-key="label"
					size="sm"
					class="vault-library-page__filter"
					:search-input="false"
					:ui="assetModalSelectMenuUi" />
				<USelectMenu
					v-model="selectedEnvironment"
					:items="environmentOptions"
					value-key="value"
					label-key="label"
					size="sm"
					class="vault-library-page__filter"
					:search-input="false"
					:ui="assetModalSelectMenuUi" />
				<USelectMenu
					v-model="selectedFavoriteFilter"
					:items="favoriteOptions"
					value-key="value"
					label-key="label"
					size="sm"
					class="vault-library-page__filter"
					:search-input="false"
					:ui="assetModalSelectMenuUi" />
				<USelectMenu
					v-model="selectedSort"
					:items="sortOptions"
					value-key="value"
					label-key="label"
					size="sm"
					class="vault-library-page__filter"
					:search-input="false"
					:ui="assetModalSelectMenuUi" />
			</template>
		</AssetLibraryToolbar>

		<div
			v-motion="gridMotion"
			class="vault-library-page__content">
			<div
				v-if="showLoadErrorState"
				class="vault-library-page__state">
				<AssetLibraryEmptyState
					icon="i-lucide-triangle-alert"
					:title="t('assets.vault.toast.loadFailedTitle')"
					:description="loadErrorMessage">
					<template #action>
						<UButton
							color="neutral"
							variant="soft"
							size="sm"
							icon="i-lucide-rotate-cw"
							@click="refresh">
							{{ t('common.actions.retry') }}
						</UButton>
					</template>
				</AssetLibraryEmptyState>
			</div>

			<div
				v-else-if="(unlocking || loading) && filteredEntries.length === 0"
				class="vault-library-page__state">
				<AssetLibraryEmptyState
					icon="i-lucide-loader-circle"
					:title="unlocking ? t('assets.vault.unlock.title') : t('common.status.loading')"
					:description="unlocking ? t('assets.vault.unlock.description') : t('assets.vault.emptyLoadingDescription')" />
			</div>

			<div
				v-else-if="filteredEntries.length === 0"
				class="vault-library-page__state">
				<AssetLibraryEmptyState
					icon="i-lucide-lock-keyhole-open"
					:title="t('assets.vault.emptyTitle')"
					:description="hasActiveFilters ? t('assets.vault.emptyFilteredDescription') : t('assets.vault.emptyIdleDescription')">
					<template #action>
						<UButton
							v-if="hasActiveFilters"
							color="neutral"
							variant="soft"
							size="sm"
							icon="i-lucide-filter-x"
							@click="resetFilters">
							{{ t('assets.vault.actions.clearFilters') }}
						</UButton>
						<UButton
							v-else
							color="primary"
							size="sm"
							icon="i-lucide-plus"
							@click="onCreateNew">
							{{ t('assets.vault.actions.createFirst') }}
						</UButton>
					</template>
				</AssetLibraryEmptyState>
			</div>

			<div
				v-else
				class="vault-library-page__grid">
				<article
					v-for="(entry, index) in filteredEntries"
					:key="entry.id"
					v-motion="entryItemMotions[index]"
					class="vault-card"
					:class="entry.favorite ? 'vault-card--favorite' : ''"
					@click="openEditor(entry)">
					<div class="vault-card__header">
						<div class="vault-card__meta">
							<div class="vault-card__title-row">
								<h3 class="vault-card__title">{{ entry.name }}</h3>
								<UBadge
									color="neutral"
									variant="soft"
									size="sm">
									{{ typeLabel(entry.type) }}
								</UBadge>
							</div>
							<div class="vault-card__caption">
								{{ t('assets.vault.labels.updatedAt', { date: formatEntryDate(entry.updatedAt) }) }}
							</div>
						</div>

						<AssetCardActions
							:favorite="entry.favorite"
							:revealed="isEntryRevealed(entry)"
							:show-reveal="true"
							@favorite="onToggleFavorite(entry)"
							@reveal="toggleEntryReveal(entry)"
							@copy="onCopyEntry(entry)" />
					</div>

					<div class="vault-card__chips">
						<UBadge
							v-if="entry.environment"
							color="warning"
							variant="soft"
							size="sm">
							{{ entry.environment }}
						</UBadge>
						<UBadge
							v-for="tag in entry.tags.slice(0, 3)"
							:key="tag"
							color="neutral"
							variant="subtle"
							size="sm">
							#{{ tag }}
						</UBadge>
						<span
							v-if="entry.tags.length > 3"
							class="vault-card__tag-overflow">
							+{{ entry.tags.length - 3 }}
						</span>
					</div>

					<div class="vault-card__secret">
						{{ isEntryRevealed(entry) ? entry.value : maskValue(entry.value) }}
					</div>

					<p
						v-if="entry.note"
						class="vault-card__note">
						{{ entry.note }}
					</p>

					<div class="vault-card__footer">
						<span>{{ t('assets.vault.labels.createdAt', { date: formatEntryDate(entry.createdAt) }) }}</span>
						<span>{{ t('assets.vault.labels.valueLength', { count: entry.value.length }) }}</span>
					</div>
				</article>
			</div>
		</div>

		<AssetWorkbenchModal
			v-model:open="editOpen"
			:title="selectedEntry?.id ? t('assets.vault.modal.editTitle') : t('assets.vault.modal.newTitle')"
			:description="t('assets.vault.modal.description')">
			<div
				v-motion="modalBodyMotion"
				class="vault-workbench">
				<section class="vault-workbench__meta">
					<div class="vault-workbench__meta-grid">
						<UFormField
							:label="t('assets.vault.fields.name')"
							required>
							<UInput
								v-model="editForm.name"
								:placeholder="t('assets.vault.placeholders.name')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>

						<UFormField :label="t('assets.vault.fields.type')">
							<USelectMenu
								v-model="editForm.type"
								:items="typeOptions"
								value-key="value"
								label-key="label"
								size="md"
								class="w-full"
								:search-input="false"
								:ui="assetModalSelectMenuUi" />
						</UFormField>

						<UFormField :label="t('assets.vault.fields.environmentOptional')">
							<UInput
								v-model="editForm.environment"
								:placeholder="t('assets.vault.placeholders.environmentOptional')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>

						<UFormField :label="t('assets.vault.fields.tagsOptional')">
							<UInput
								v-model="tagsInput"
								:placeholder="t('assets.vault.placeholders.tagsOptional')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi"
								@blur="onTagsBlur" />
						</UFormField>

						<UFormField :label="t('assets.vault.fields.folderOptional')">
							<UInput
								v-model="editForm.folder"
								:placeholder="t('assets.vault.placeholders.folderOptional')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>

						<UFormField :label="t('assets.vault.fields.noteOptional')">
							<UTextarea
								v-model="editForm.note"
								:placeholder="t('assets.vault.placeholders.noteOptional')"
								:rows="4"
								size="md"
								class="w-full"
								autoresize
								:ui="assetModalTextareaUi" />
						</UFormField>
					</div>

					<div class="vault-workbench__meta-summary">
						<UBadge
							color="neutral"
							variant="soft"
							size="sm">
							{{ typeLabel(editForm.type) }}
						</UBadge>
						<UBadge
							v-if="editForm.environment"
							color="warning"
							variant="soft"
							size="sm">
							{{ editForm.environment }}
						</UBadge>
						<UBadge
							v-if="editForm.favorite"
							color="warning"
							variant="soft"
							size="sm">
							{{ t('assets.vault.labels.favorite') }}
						</UBadge>
						<div class="vault-workbench__timestamps">
							<div v-if="selectedEntry">
								{{ t('assets.vault.labels.createdAt', { date: formatEntryDate(selectedEntry.createdAt) }) }}
							</div>
							<div v-if="selectedEntry">
								{{ t('assets.vault.labels.updatedAt', { date: formatEntryDate(selectedEntry.updatedAt) }) }}
							</div>
						</div>
					</div>
				</section>

				<section class="vault-workbench__secret">
					<div class="vault-workbench__secret-toolbar">
						<div class="vault-workbench__secret-title">
							{{ t('assets.vault.fields.value') }}
						</div>
						<div class="vault-workbench__secret-actions">
							<UButton
								color="neutral"
								variant="ghost"
								size="xs"
								:icon="showValue ? 'i-lucide-eye-off' : 'i-lucide-eye'"
								@click="toggleSensitiveValue">
								{{ showValue ? t('assets.vault.actions.hideValue') : t('assets.vault.actions.showValue') }}
							</UButton>
							<UButton
								color="neutral"
								variant="ghost"
								size="xs"
								icon="i-lucide-copy"
								@click="onCopyDraft">
								{{ t('common.actions.copy') }}
							</UButton>
						</div>
					</div>

					<div
						v-if="selectedEntry?.id && !showValue"
						class="vault-workbench__secret-mask">
						<div class="vault-workbench__secret-mask-value">{{ maskValue(editForm.value) }}</div>
						<p class="vault-workbench__secret-mask-copy">
							{{ t('assets.vault.labels.hiddenHint') }}
						</p>
					</div>

					<UTextarea
						v-else
						v-model="editForm.value"
						:placeholder="t('assets.vault.placeholders.value')"
						:rows="14"
						size="md"
						class="w-full"
						autoresize
						:ui="assetModalTextareaUi" />
				</section>
			</div>

			<template #footer>
				<div
					v-motion="modalFooterMotion"
					class="vault-workbench__footer">
					<div class="vault-workbench__footer-meta">
						<UButton
							color="neutral"
							variant="ghost"
							size="sm"
							:icon="editForm.favorite ? 'i-lucide-star' : 'i-lucide-star-off'"
							@click="editForm.favorite = !editForm.favorite">
							{{ editForm.favorite ? t('assets.vault.actions.unfavorite') : t('assets.vault.actions.favorite') }}
						</UButton>
						<UButton
							v-if="selectedEntry?.id"
							color="error"
							variant="ghost"
							size="sm"
							icon="i-lucide-trash-2"
							@click="onDelete(selectedEntry.id)">
							{{ t('common.actions.delete') }}
						</UButton>
					</div>

					<div class="vault-workbench__footer-actions">
						<UButton
							color="neutral"
							variant="ghost"
							size="sm"
							@click="closeEditor">
							{{ t('common.actions.cancel') }}
						</UButton>
						<UButton
							color="primary"
							size="sm"
							icon="i-lucide-save"
							@click="onSave">
							{{ t('common.actions.save') }}
						</UButton>
					</div>
				</div>
			</template>
		</AssetWorkbenchModal>

		<UModal
			v-model:open="exportOpen"
			:title="t('assets.vault.export.title')"
			:description="t('assets.vault.export.description')"
			:ui="vaultTransferModalUi">
			<template #body>
				<div class="vault-transfer-modal">
					<p class="vault-transfer-modal__hint">
						{{ t('assets.vault.export.hint') }}
					</p>
					<UFormField :label="t('assets.vault.export.password')">
						<UInput
							v-model="exportPassword"
							type="password"
							size="md"
							class="w-full"
							:ui="assetModalInputUi" />
					</UFormField>
					<UFormField :label="t('assets.vault.export.confirmPassword')">
						<UInput
							v-model="exportPasswordConfirm"
							type="password"
							size="md"
							class="w-full"
							:ui="assetModalInputUi" />
					</UFormField>
				</div>
			</template>

			<template #footer>
				<div class="vault-transfer-modal__footer">
					<UButton
						color="neutral"
						variant="ghost"
						size="sm"
						@click="closeExportModal">
						{{ t('common.actions.cancel') }}
					</UButton>
					<UButton
						color="primary"
						size="sm"
						icon="i-lucide-download"
						:loading="exporting"
						:disabled="!canExport"
						@click="onExportVault">
						{{ t('assets.vault.export.action') }}
					</UButton>
				</div>
			</template>
		</UModal>

		<UModal
			v-model:open="importOpen"
			:title="t('assets.vault.import.title')"
			:description="t('assets.vault.import.description')"
			:ui="vaultTransferModalUi">
			<template #body>
				<div class="vault-transfer-modal">
					<p class="vault-transfer-modal__hint">
						{{ t('assets.vault.import.hint') }}
					</p>
					<div class="vault-transfer-modal__file">
						<UButton
							color="neutral"
							variant="soft"
							size="sm"
							icon="i-lucide-file-up"
							@click="triggerImportFilePick">
							{{ t('assets.vault.import.pickFile') }}
						</UButton>
						<span class="vault-transfer-modal__file-name">
							{{ importFileName || t('assets.vault.import.noFileSelected') }}
						</span>
						<input
							id="vault-import-file-input"
							type="file"
							accept="application/json,.json"
							class="hidden"
							@change="onImportFileChange" />
					</div>
					<UFormField :label="t('assets.vault.import.password')">
						<UInput
							v-model="importPassword"
							type="password"
							size="md"
							class="w-full"
							:ui="assetModalInputUi" />
					</UFormField>
				</div>
			</template>

			<template #footer>
				<div class="vault-transfer-modal__footer">
					<UButton
						color="neutral"
						variant="ghost"
						size="sm"
						@click="closeImportModal">
						{{ t('common.actions.cancel') }}
					</UButton>
					<UButton
						color="primary"
						size="sm"
						icon="i-lucide-upload"
						:loading="importing"
						:disabled="!canImport"
						@click="onImportVault">
						{{ t('assets.vault.import.action') }}
					</UButton>
				</div>
			</template>
		</UModal>
	</section>
</template>

<script setup lang="ts">
	import { useRouteMetaShellBreadcrumb } from '@/app/shell-header'
	import { createModalLayerUi } from '@/config/ui-layer'
	import {
		AssetCardActions,
		AssetLibraryEmptyState,
		AssetLibraryToolbar,
		AssetWorkbenchModal,
		assetModalInputUi,
		assetModalSelectMenuUi,
		assetModalTextareaUi,
		useAssetsVaultPageFacade,
	} from '@/features/assets'

	useRouteMetaShellBreadcrumb('assets-vault-page')

	const {
		t,
		toolbarMotion,
		gridMotion,
		modalBodyMotion,
		modalFooterMotion,
		loading,
		unlocking,
		loadErrorMessage,
		showLoadErrorState,
		selectedEntry,
		editOpen,
		searchKeyword,
		selectedType,
		selectedEnvironment,
		selectedFavoriteFilter,
		selectedSort,
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
		entryItemMotions,
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
	} = useAssetsVaultPageFacade()

	const vaultTransferModalUi = createModalLayerUi({
		width: 'sm:max-w-xl',
		rounded: 'rounded-[1.75rem]',
		content:
			'border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_28px_72px_rgba(15,23,42,0.18)]',
	})
</script>

<style scoped>
	.vault-library-page {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 1rem;
		height: 100%;
		min-height: 0;
	}

	.vault-library-page__content {
		min-height: 0;
		overflow-y: auto;
		padding-right: 0.2rem;
	}

	.vault-library-page__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
		gap: 1rem;
		padding-bottom: 0.35rem;
	}

	.vault-library-page__state {
		padding-top: 0.25rem;
	}

	.vault-library-page__filter {
		min-width: 11rem;
	}

	.vault-card {
		display: grid;
		gap: 0.85rem;
		padding: 1rem;
		border: 1px solid rgb(203 213 225 / 0.8);
		border-radius: 1.6rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.97), rgb(248 250 252 / 0.94)),
			radial-gradient(circle at top right, rgb(251 191 36 / 0.12), transparent 34%),
			radial-gradient(circle at bottom left, rgb(34 197 94 / 0.08), transparent 38%);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.85),
			0 18px 36px rgb(15 23 42 / 0.08);
		cursor: pointer;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease,
			border-color 160ms ease;
	}

	.vault-card:hover {
		transform: translateY(-2px);
		border-color: rgb(250 204 21 / 0.55);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.88),
			0 24px 48px rgb(120 53 15 / 0.12);
	}

	.vault-card--favorite {
		border-color: rgb(250 204 21 / 0.55);
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.98), rgb(255 251 235 / 0.94)),
			radial-gradient(circle at top right, rgb(245 158 11 / 0.16), transparent 36%);
	}

	.vault-card__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.vault-card__meta {
		min-width: 0;
		display: grid;
		gap: 0.45rem;
	}

	.vault-card__title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.vault-card__title {
		font-size: 0.98rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: rgb(15 23 42);
	}

	.vault-card__caption {
		font-size: 0.74rem;
		color: rgb(71 85 105);
	}

	.vault-card__chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

	.vault-card__tag-overflow {
		font-size: 0.72rem;
		color: rgb(71 85 105);
	}

	.vault-card__secret {
		padding: 0.95rem 1rem;
		border-radius: 1.2rem;
		background:
			linear-gradient(180deg, rgb(15 23 42), rgb(30 41 59)),
			radial-gradient(circle at top, rgb(250 204 21 / 0.14), transparent 46%);
		font-family: 'Iosevka Comfy', 'Fira Code', 'JetBrains Mono', monospace;
		font-size: 0.78rem;
		line-height: 1.6;
		color: rgb(226 232 240);
		word-break: break-all;
	}

	.vault-card__note {
		font-size: 0.79rem;
		line-height: 1.6;
		color: rgb(71 85 105);
	}

	.vault-card__footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		font-size: 0.72rem;
		color: rgb(100 116 139);
	}

	.vault-workbench {
		display: grid;
		grid-template-columns: minmax(16rem, 21rem) minmax(0, 1fr);
		gap: 1rem;
		min-height: min(70vh, 40rem);
	}

	.vault-workbench__meta,
	.vault-workbench__secret {
		display: grid;
		align-content: start;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid rgb(226 232 240 / 0.92);
		border-radius: 1.5rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.97), rgb(248 250 252 / 0.94)),
			radial-gradient(circle at top, rgb(250 204 21 / 0.08), transparent 44%);
	}

	.vault-workbench__meta-grid {
		display: grid;
		gap: 0.95rem;
	}

	.vault-workbench__meta-summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding-top: 0.35rem;
		border-top: 1px solid rgb(226 232 240 / 0.85);
	}

	.vault-workbench__timestamps {
		display: grid;
		gap: 0.25rem;
		width: 100%;
		font-size: 0.74rem;
		line-height: 1.55;
		color: rgb(100 116 139);
	}

	.vault-workbench__secret-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.vault-workbench__secret-title {
		font-size: 0.9rem;
		font-weight: 700;
		color: rgb(15 23 42);
	}

	.vault-workbench__secret-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.vault-workbench__secret-mask {
		display: grid;
		place-items: center;
		min-height: 18rem;
		padding: 1.25rem;
		border: 1px dashed rgb(245 158 11 / 0.35);
		border-radius: 1.35rem;
		background:
			linear-gradient(180deg, rgb(15 23 42), rgb(30 41 59)),
			radial-gradient(circle at top, rgb(250 204 21 / 0.16), transparent 44%);
		text-align: center;
	}

	.vault-workbench__secret-mask-value {
		font-family: 'Iosevka Comfy', 'Fira Code', 'JetBrains Mono', monospace;
		font-size: 0.95rem;
		line-height: 1.7;
		color: rgb(248 250 252);
		word-break: break-all;
	}

	.vault-workbench__secret-mask-copy {
		margin-top: 0.85rem;
		font-size: 0.76rem;
		line-height: 1.6;
		color: rgb(226 232 240 / 0.8);
	}

	.vault-workbench__footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
	}

	.vault-workbench__footer-meta,
	.vault-workbench__footer-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.vault-transfer-modal {
		display: grid;
		gap: 1rem;
	}

	.vault-transfer-modal__hint {
		font-size: 0.92rem;
		line-height: 1.65;
		color: rgb(71 85 105);
	}

	.vault-transfer-modal__file {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.vault-transfer-modal__file-name {
		font-size: 0.9rem;
		color: rgb(71 85 105);
	}

	.vault-transfer-modal__footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.65rem;
		width: 100%;
	}

	@media (max-width: 1120px) {
		.vault-workbench {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.vault-library-page__filter {
			min-width: 100%;
		}

		.vault-library-page__grid {
			grid-template-columns: 1fr;
		}

		.vault-workbench__secret-toolbar,
		.vault-workbench__footer,
		.vault-transfer-modal__footer {
			flex-direction: column;
			align-items: stretch;
		}

		.vault-workbench__footer-meta,
		.vault-workbench__footer-actions {
			justify-content: space-between;
		}
	}
</style>
