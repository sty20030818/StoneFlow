<template>
	<section class="snippet-library-page">
		<AssetLibraryToolbar
			v-motion="toolbarMotion"
			v-model:search="searchKeyword"
			:title="t('assets.snippets.title')"
			:description="t('assets.snippets.subtitle')"
			:search-placeholder="t('assets.snippets.searchPlaceholder')">
			<template #eyebrow>
				<UIcon
					name="i-lucide-code-xml"
					class="size-4" />
				<span>{{ t('assets.snippets.labels.repository') }}</span>
			</template>

			<template #actions>
				<UBadge
					color="neutral"
					variant="soft"
					size="sm">
					{{ filteredSnippets.length }} {{ t('assets.snippets.labels.items') }}
				</UBadge>
				<UBadge
					color="warning"
					variant="soft"
					size="sm">
					{{ favoriteCount }} {{ t('assets.snippets.labels.favorites') }}
				</UBadge>
				<UButton
					v-if="hasActiveFilters"
					color="neutral"
					variant="ghost"
					size="sm"
					icon="i-lucide-filter-x"
					@click="resetFilters">
					{{ t('assets.snippets.actions.clearFilters') }}
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
					v-model="selectedLanguage"
					:items="languageOptions"
					value-key="value"
					label-key="label"
					size="sm"
					class="snippet-library-page__filter"
					:search-input="false"
					:ui="assetModalSelectMenuUi" />
				<USelectMenu
					v-model="selectedTag"
					:items="tagOptions"
					value-key="value"
					label-key="label"
					size="sm"
					class="snippet-library-page__filter"
					:search-input="false"
					:ui="assetModalSelectMenuUi" />
				<USelectMenu
					v-model="selectedFavoriteFilter"
					:items="favoriteOptions"
					value-key="value"
					label-key="label"
					size="sm"
					class="snippet-library-page__filter"
					:search-input="false"
					:ui="assetModalSelectMenuUi" />
				<USelectMenu
					v-model="selectedSort"
					:items="sortOptions"
					value-key="value"
					label-key="label"
					size="sm"
					class="snippet-library-page__filter"
					:search-input="false"
					:ui="assetModalSelectMenuUi" />
			</template>
		</AssetLibraryToolbar>

		<div
			v-motion="gridMotion"
			class="snippet-library-page__content">
			<div
				v-if="showLoadErrorState"
				class="snippet-library-page__state">
				<AssetLibraryEmptyState
					icon="i-lucide-triangle-alert"
					:title="t('assets.snippets.toast.loadFailedTitle')"
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
				v-else-if="loading && filteredSnippets.length === 0"
				class="snippet-library-page__state">
				<AssetLibraryEmptyState
					icon="i-lucide-loader-circle"
					:title="t('common.status.loading')"
					:description="t('assets.snippets.emptyLoadingDescription')" />
			</div>

			<div
				v-else-if="filteredSnippets.length === 0"
				class="snippet-library-page__state">
				<AssetLibraryEmptyState
					icon="i-lucide-folder-search"
					:title="t('assets.snippets.emptyTitle')"
					:description="hasActiveFilters ? t('assets.snippets.emptyFilteredDescription') : t('assets.snippets.emptyIdleDescription')">
					<template #action>
						<UButton
							v-if="hasActiveFilters"
							color="neutral"
							variant="soft"
							size="sm"
							icon="i-lucide-filter-x"
							@click="resetFilters">
							{{ t('assets.snippets.actions.clearFilters') }}
						</UButton>
						<UButton
							v-else
							color="primary"
							size="sm"
							icon="i-lucide-plus"
							@click="onCreateNew">
							{{ t('assets.snippets.actions.createFirst') }}
						</UButton>
					</template>
				</AssetLibraryEmptyState>
			</div>

			<div
				v-else
				class="snippet-library-page__grid">
				<article
					v-for="(snippet, index) in filteredSnippets"
					:key="snippet.id"
					v-motion="snippetItemMotions[index]"
					class="snippet-card"
					:class="snippet.favorite ? 'snippet-card--favorite' : ''"
					@click="openEditor(snippet)">
					<div class="snippet-card__header">
						<div class="snippet-card__meta">
							<div class="snippet-card__title-row">
								<h3 class="snippet-card__title">
									{{ snippet.title || t('assets.common.untitled') }}
								</h3>
								<UBadge
									color="primary"
									variant="soft"
									size="sm">
									{{ languageLabel(snippet.language) }}
								</UBadge>
							</div>
							<div class="snippet-card__caption">
								{{ t('assets.snippets.labels.updatedAt', { date: formatSnippetDate(snippet.updatedAt) }) }}
							</div>
						</div>

						<AssetCardActions
							:favorite="snippet.favorite"
							@favorite="onToggleFavorite(snippet)"
							@copy="onCopySnippet(snippet)" />
					</div>

					<div
						v-if="snippet.tags.length"
						class="snippet-card__tags">
						<UBadge
							v-for="tag in snippet.tags.slice(0, 4)"
							:key="tag"
							color="neutral"
							variant="subtle"
							size="sm">
							#{{ tag }}
						</UBadge>
						<span
							v-if="snippet.tags.length > 4"
							class="snippet-card__tag-overflow">
							+{{ snippet.tags.length - 4 }}
						</span>
					</div>

					<p
						v-if="snippet.description"
						class="snippet-card__description">
						{{ snippet.description }}
					</p>

					<div class="snippet-card__code-frame">
						<pre class="snippet-card__code"><code>{{ previewContent(snippet.content) || t('assets.snippets.labels.noPreview') }}</code></pre>
					</div>

					<div class="snippet-card__footer">
						<span>{{ t('assets.snippets.labels.createdAt', { date: formatSnippetDate(snippet.createdAt) }) }}</span>
						<span>{{ t('assets.snippets.labels.lineCount', { count: Math.max(snippet.content.split('\n').length, 1) }) }}</span>
					</div>
				</article>
			</div>
		</div>

		<AssetWorkbenchModal
			v-model:open="editOpen"
			:title="selectedSnippet?.id ? t('assets.snippets.modal.editTitle') : t('assets.snippets.modal.newTitle')"
			:description="t('assets.snippets.modal.description')">
			<div
				v-motion="modalBodyMotion"
				class="snippet-workbench">
				<section class="snippet-workbench__meta">
					<div class="snippet-workbench__meta-grid">
						<UFormField
							:label="t('assets.snippets.fields.title')"
							required>
							<UInput
								v-model="editForm.title"
								:placeholder="t('assets.snippets.placeholders.title')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>

						<UFormField :label="t('assets.snippets.fields.language')">
							<UInput
								v-model="editForm.language"
								:placeholder="t('assets.snippets.placeholders.language')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>

						<UFormField :label="t('assets.snippets.fields.descriptionOptional')">
							<UTextarea
								v-model="editForm.description"
								:placeholder="t('assets.snippets.placeholders.description')"
								:rows="4"
								size="md"
								class="w-full"
								autoresize
								:ui="assetModalTextareaUi" />
						</UFormField>

						<UFormField :label="t('assets.snippets.fields.tagsOptional')">
							<UInput
								v-model="tagsInput"
								:placeholder="t('assets.snippets.placeholders.tags')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi"
								@blur="onTagsBlur" />
						</UFormField>

						<UFormField :label="t('assets.snippets.fields.folderOptional')">
							<UInput
								v-model="editForm.folder"
								:placeholder="t('assets.snippets.placeholders.folderOptional')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>
					</div>

					<div class="snippet-workbench__meta-summary">
						<UBadge
							color="neutral"
							variant="soft"
							size="sm">
							{{ currentLanguageLabel }}
						</UBadge>
						<UBadge
							v-if="editForm.favorite"
							color="warning"
							variant="soft"
							size="sm">
							{{ t('assets.snippets.labels.favorite') }}
						</UBadge>
						<div class="snippet-workbench__timestamps">
							<div v-if="selectedSnippet">
								{{ t('assets.snippets.labels.createdAt', { date: formatSnippetDate(selectedSnippet.createdAt) }) }}
							</div>
							<div v-if="selectedSnippet">
								{{ t('assets.snippets.labels.updatedAt', { date: formatSnippetDate(selectedSnippet.updatedAt) }) }}
							</div>
						</div>
					</div>
				</section>

				<section class="snippet-workbench__editor">
					<AssetEditorSurface
						v-model="editForm.content"
						mode="code"
						:language="editForm.language"
						:language-label="currentLanguageLabel"
						:label="t('assets.snippets.fields.content')"
						:placeholder="t('assets.snippets.placeholders.content')"
						min-height="32rem">
						<template #toolbar>
							<UButton
								color="neutral"
								variant="ghost"
								size="xs"
								icon="i-lucide-copy"
								@click="onCopyDraft">
								{{ t('common.actions.copy') }}
							</UButton>
						</template>
					</AssetEditorSurface>
				</section>
			</div>

			<template #footer>
				<div
					v-motion="modalFooterMotion"
					class="snippet-workbench__footer">
					<div class="snippet-workbench__footer-meta">
						<UButton
							color="neutral"
							variant="ghost"
							size="sm"
							:icon="editForm.favorite ? 'i-lucide-star' : 'i-lucide-star-off'"
							@click="editForm.favorite = !editForm.favorite">
							{{ editForm.favorite ? t('assets.snippets.actions.unfavorite') : t('assets.snippets.actions.favorite') }}
						</UButton>
						<UButton
							v-if="selectedSnippet?.id"
							color="error"
							variant="ghost"
							size="sm"
							icon="i-lucide-trash-2"
							@click="onDelete(selectedSnippet.id)">
							{{ t('common.actions.delete') }}
						</UButton>
					</div>

					<div class="snippet-workbench__footer-actions">
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
	</section>
</template>

<script setup lang="ts">
	import { useRouteMetaShellBreadcrumb } from '@/app/shell-header'
	import {
		AssetCardActions,
		AssetEditorSurface,
		AssetLibraryEmptyState,
		AssetLibraryToolbar,
		AssetWorkbenchModal,
		assetModalInputUi,
		assetModalSelectMenuUi,
		assetModalTextareaUi,
		useAssetsSnippetsPageFacade,
	} from '@/features/assets'

	useRouteMetaShellBreadcrumb('assets-snippets-page')

	const {
		t,
		toolbarMotion,
		gridMotion,
		modalBodyMotion,
		modalFooterMotion,
		loading,
		loadErrorMessage,
		showLoadErrorState,
		selectedSnippet,
		editOpen,
		searchKeyword,
		selectedLanguage,
		selectedTag,
		selectedFavoriteFilter,
		selectedSort,
		editForm,
		tagsInput,
		languageOptions,
		tagOptions,
		favoriteOptions,
		sortOptions,
		hasActiveFilters,
		favoriteCount,
		filteredSnippets,
		currentLanguageLabel,
		snippetItemMotions,
		resetFilters,
		refresh,
		openEditor,
		onCreateNew,
		closeEditor,
		onTagsBlur,
		onSave,
		onDelete,
		onToggleFavorite,
		onCopySnippet,
		onCopyDraft,
		formatSnippetDate,
		previewContent,
		languageLabel,
	} = useAssetsSnippetsPageFacade()
</script>

<style scoped>
	.snippet-library-page {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 1rem;
		height: 100%;
		min-height: 0;
	}

	.snippet-library-page__content {
		min-height: 0;
		overflow-y: auto;
		padding-right: 0.2rem;
	}

	.snippet-library-page__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
		gap: 1rem;
		padding-bottom: 0.35rem;
	}

	.snippet-library-page__state {
		padding-top: 0.25rem;
	}

	.snippet-library-page__filter {
		min-width: 11rem;
	}

	.snippet-card {
		display: grid;
		gap: 0.9rem;
		padding: 1rem;
		border: 1px solid rgb(203 213 225 / 0.8);
		border-radius: 1.6rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.96), rgb(241 245 249 / 0.94)),
			radial-gradient(circle at top right, rgb(34 211 238 / 0.12), transparent 32%),
			radial-gradient(circle at bottom left, rgb(16 185 129 / 0.08), transparent 36%);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.85),
			0 18px 36px rgb(15 23 42 / 0.08);
		cursor: pointer;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease,
			border-color 160ms ease;
	}

	.snippet-card:hover {
		transform: translateY(-2px);
		border-color: rgb(34 211 238 / 0.55);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.9),
			0 24px 48px rgb(8 47 73 / 0.12);
	}

	.snippet-card--favorite {
		border-color: rgb(250 204 21 / 0.55);
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.98), rgb(254 252 232 / 0.92)),
			radial-gradient(circle at top right, rgb(250 204 21 / 0.16), transparent 34%);
	}

	.snippet-card__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.snippet-card__meta {
		min-width: 0;
		display: grid;
		gap: 0.45rem;
	}

	.snippet-card__title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.snippet-card__title {
		max-width: 100%;
		font-size: 0.98rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: rgb(15 23 42);
	}

	.snippet-card__caption {
		font-size: 0.74rem;
		color: rgb(71 85 105);
	}

	.snippet-card__tags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

	.snippet-card__tag-overflow {
		font-size: 0.72rem;
		color: rgb(71 85 105);
	}

	.snippet-card__description {
		font-size: 0.8rem;
		line-height: 1.6;
		color: rgb(71 85 105);
	}

	.snippet-card__code-frame {
		position: relative;
		overflow: hidden;
		border-radius: 1.25rem;
		background:
			linear-gradient(180deg, rgb(15 23 42), rgb(2 6 23)),
			radial-gradient(circle at top, rgb(34 211 238 / 0.14), transparent 46%);
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.03);
	}

	.snippet-card__code-frame::after {
		content: '';
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		height: 3rem;
		background: linear-gradient(180deg, rgb(15 23 42 / 0), rgb(2 6 23 / 0.95));
	}

	.snippet-card__code {
		min-height: 10rem;
		padding: 1rem 1rem 1.3rem;
		font-family: 'Iosevka Comfy', 'Fira Code', 'JetBrains Mono', monospace;
		font-size: 0.76rem;
		line-height: 1.65;
		color: rgb(226 232 240);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.snippet-card__footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		font-size: 0.72rem;
		color: rgb(100 116 139);
	}

	.snippet-workbench {
		display: grid;
		grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
		gap: 1rem;
		min-height: min(72vh, 42rem);
	}

	.snippet-workbench__meta {
		display: grid;
		align-content: start;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid rgb(226 232 240 / 0.92);
		border-radius: 1.5rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.96), rgb(248 250 252 / 0.94)),
			radial-gradient(circle at top, rgb(34 197 94 / 0.08), transparent 42%);
	}

	.snippet-workbench__meta-grid {
		display: grid;
		gap: 0.95rem;
	}

	.snippet-workbench__meta-summary {
		display: grid;
		gap: 0.55rem;
		padding-top: 0.25rem;
		border-top: 1px solid rgb(226 232 240 / 0.85);
	}

	.snippet-workbench__timestamps {
		display: grid;
		gap: 0.3rem;
		font-size: 0.74rem;
		line-height: 1.55;
		color: rgb(100 116 139);
	}

	.snippet-workbench__editor {
		min-width: 0;
	}

	.snippet-workbench__footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
	}

	.snippet-workbench__footer-meta,
	.snippet-workbench__footer-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	@media (max-width: 1120px) {
		.snippet-workbench {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.snippet-library-page__filter {
			min-width: 100%;
		}

		.snippet-library-page__grid {
			grid-template-columns: 1fr;
		}

		.snippet-workbench__footer {
			flex-direction: column;
			align-items: stretch;
		}

		.snippet-workbench__footer-meta,
		.snippet-workbench__footer-actions {
			justify-content: space-between;
		}
	}
</style>
