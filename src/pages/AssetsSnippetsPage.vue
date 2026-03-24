<template>
	<section class="snippet-library-page">
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
					:description="
						hasActiveFilters ? t('assets.snippets.emptyFilteredDescription') : t('assets.snippets.emptyIdleDescription')
					">
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
						</div>

						<AssetCardActions
							:favorite="snippet.favorite"
							@favorite="onToggleFavorite(snippet)"
							@copy="onCopySnippet(snippet)" />
					</div>

					<p
						v-if="snippet.description"
						class="snippet-card__description">
						{{ snippet.description }}
					</p>

					<div class="snippet-card__middle">
						<div class="snippet-card__code-frame">
							<SnippetCardCodePreview
								v-if="snippet.content.trim()"
								:content="snippet.content"
								:language="snippet.language"
								:max-lines="16" />
							<div
								v-else
								class="snippet-card__code-empty">
								{{ t('assets.snippets.labels.noPreview') }}
							</div>
						</div>

						<div
							v-if="snippet.tags.length"
							class="snippet-card__tags">
							<UBadge
								v-for="tag in snippet.tags.slice(0, 3)"
								:key="tag"
								color="neutral"
								variant="subtle"
								size="sm">
								#{{ tag }}
							</UBadge>
							<span
								v-if="snippet.tags.length > 3"
								class="snippet-card__tag-overflow">
								+{{ snippet.tags.length - 3 }}
							</span>
						</div>
					</div>

					<div class="snippet-card__footer">
						<span>
							{{
								snippet.updatedAt > snippet.createdAt
									? t('assets.snippets.labels.updatedAt', { date: formatSnippetDate(snippet.updatedAt) })
									: t('assets.snippets.labels.createdAt', { date: formatSnippetDate(snippet.createdAt) })
							}}
						</span>
						<span>
							{{ t('assets.snippets.labels.lineCount', { count: Math.max(snippet.content.split('\n').length, 1) }) }}
						</span>
					</div>
				</article>
			</div>
		</div>

		<AssetWorkbenchModal
			v-model:open="editOpen"
			:close="false"
			prevent-auto-focus>
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
							<USelectMenu
								v-model="editForm.language"
								:items="editorLanguageOptions"
								value-key="value"
								label-key="label"
								size="md"
								class="w-full"
								:search-input="false"
								:ui="assetModalSelectMenuUi" />
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
						fill-height
						mode="code"
						:language="editForm.language"
						:language-label="currentLanguageLabel"
						:label="t('assets.snippets.fields.content')"
						:placeholder="t('assets.snippets.placeholders.content')"
						sticky-header
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
							size="md"
							:icon="editForm.favorite ? 'i-lucide-star' : 'i-lucide-star-off'"
							@click="editForm.favorite = !editForm.favorite">
							{{ editForm.favorite ? t('assets.snippets.actions.unfavorite') : t('assets.snippets.actions.favorite') }}
						</UButton>
						<UButton
							v-if="selectedSnippet?.id"
							color="error"
							variant="ghost"
							size="md"
							icon="i-lucide-trash-2"
							@click="onDelete(selectedSnippet.id)">
							{{ t('common.actions.delete') }}
						</UButton>
					</div>

					<div class="snippet-workbench__footer-actions">
						<UButton
							color="neutral"
							variant="ghost"
							size="md"
							@click="closeEditor">
							{{ t('common.actions.cancel') }}
						</UButton>
						<UButton
							color="primary"
							size="md"
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
		AssetWorkbenchModal,
		SnippetCardCodePreview,
		assetModalInputUi,
		assetModalSelectMenuUi,
		assetModalTextareaUi,
		useAssetsSnippetsPageFacade,
		useAssetsSnippetsShellHeader,
	} from '@/features/assets'

	useRouteMetaShellBreadcrumb('assets-snippets-page')
	useAssetsSnippetsShellHeader()

	const pageFacade = useAssetsSnippetsPageFacade()

	// 当前页的 v-motion 指令类型推断会递归爆炸，这里只在模板层截断类型计算，不影响运行时值。
	const gridMotion = pageFacade.gridMotion as never
	const modalBodyMotion = pageFacade.modalBodyMotion as never
	const modalFooterMotion = pageFacade.modalFooterMotion as never
	const snippetItemMotions = pageFacade.snippetItemMotions as never

	const {
		t,
		loading,
		loadErrorMessage,
		showLoadErrorState,
		selectedSnippet,
		editOpen,
		editForm,
		tagsInput,
		editorLanguageOptions,
		hasActiveFilters,
		filteredSnippets,
		currentLanguageLabel,
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
		languageLabel,
	} = pageFacade
</script>

<style scoped>
	.snippet-library-page {
		height: 100%;
		min-height: 0;
	}

	.snippet-library-page__content {
		min-height: 0;
		overflow-y: auto;
		padding-right: 0.35rem;
		padding-bottom: 1rem;
	}

	.snippet-library-page__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
		gap: 1rem;
		padding-bottom: 0.8rem;
	}

	.snippet-library-page__state {
		padding-top: 0.25rem;
	}

	.snippet-card {
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr) auto;
		align-content: start;
		gap: 0.72rem;
		padding: 1rem;
		height: 20rem;
		max-height: 20rem;
		border: 1px solid rgb(203 213 225 / 0.8);
		border-radius: 1.6rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.98), rgb(248 250 252 / 0.94)),
			radial-gradient(circle at top right, rgb(34 211 238 / 0.1), transparent 30%),
			radial-gradient(circle at bottom left, rgb(16 185 129 / 0.06), transparent 34%);
		cursor: pointer;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease;
	}

	.snippet-card:hover {
		transform: translateY(-2px);
		border-color: rgb(34 211 238 / 0.55);
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.99), rgb(240 249 255 / 0.96)),
			radial-gradient(circle at top right, rgb(34 211 238 / 0.14), transparent 28%),
			radial-gradient(circle at bottom left, rgb(16 185 129 / 0.08), transparent 32%);
	}

	.snippet-card--favorite {
		border-color: rgb(250 204 21 / 0.55);
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.98), rgb(254 252 232 / 0.92)),
			radial-gradient(circle at top right, rgb(250 204 21 / 0.16), transparent 34%);
	}

	.snippet-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.snippet-card__meta {
		min-width: 0;
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

	.snippet-card__tags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		min-height: 1.75rem;
	}

	.snippet-card__tag-overflow {
		font-size: 0.72rem;
		color: rgb(71 85 105);
	}

	.snippet-card__description {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.55;
		color: rgb(71 85 105);
		line-clamp: 1;
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 1;
	}

	.snippet-card__middle {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		min-height: 0;
		height: 100%;
	}

	.snippet-card__code-frame {
		flex: 1 1 auto;
		position: relative;
		min-height: 0;
		height: 100%;
		overflow: hidden;
		border-radius: 1.25rem;
		border: 1px solid rgb(30 41 59 / 0.75);
		background:
			linear-gradient(180deg, rgb(15 23 42), rgb(2 6 23)),
			radial-gradient(circle at top, rgb(34 211 238 / 0.14), transparent 46%);
	}

	.snippet-card__code-frame::after {
		content: '';
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		height: 1.9rem;
		background: linear-gradient(180deg, rgb(15 23 42 / 0), rgb(2 6 23 / 0.95));
	}

	.snippet-card__code-frame :deep(.snippet-card-code-preview) {
		height: 100%;
		width: 100%;
	}

	.snippet-card__code-empty {
		width: 100%;
		height: 100%;
		min-height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		font-size: 0.76rem;
		line-height: 1.55;
		color: rgb(226 232 240);
		text-align: center;
	}

	.snippet-card__footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		align-self: end;
		gap: 0.6rem;
		font-size: 0.72rem;
		color: rgb(100 116 139);
	}

	.snippet-workbench {
		display: grid;
		grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
		gap: 1rem;
		height: min(72vh, 42rem);
		min-height: 0;
		overflow: hidden;
	}

	.snippet-workbench__meta {
		display: grid;
		height: 100%;
		min-height: 0;
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
		min-height: 0;
		height: 100%;
		padding: 1rem;
		border: 1px solid rgb(226 232 240 / 0.92);
		border-radius: 1.5rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.96), rgb(248 250 252 / 0.94)),
			radial-gradient(circle at top, rgb(14 165 233 / 0.08), transparent 44%);
		overflow: hidden;
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
			grid-template-rows: auto minmax(0, 1fr);
		}
	}

	@media (max-width: 768px) {
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
