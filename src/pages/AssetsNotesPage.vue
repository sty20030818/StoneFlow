<template>
	<section class="notes-page">
		<AssetDocumentWorkspace
			v-motion="workspaceMotion"
			v-model:mode="workspaceMode"
			:title="selectedNote?.title || t('assets.notes.labels.newNote')"
			:description="saveIndicator">
			<template #sidebar>
				<div class="notes-page__sidebar">
					<div class="notes-page__sidebar-header">
						<div>
							<div class="notes-page__sidebar-title">{{ t('assets.notes.title') }}</div>
							<div class="notes-page__sidebar-description">{{ t('assets.notes.subtitle') }}</div>
						</div>
						<UButton
							color="primary"
							size="sm"
							icon="i-lucide-plus"
							@click="onCreateNew">
							{{ t('common.actions.new') }}
						</UButton>
					</div>

					<div class="notes-page__sidebar-controls">
						<UInput
							v-model="searchKeyword"
							icon="i-lucide-search"
							:placeholder="t('assets.notes.searchPlaceholder')"
							size="sm"
							class="w-full" />
						<div class="notes-page__sidebar-filters">
							<USelectMenu
								v-model="selectedTag"
								:items="tagOptions"
								value-key="value"
								label-key="label"
								size="sm"
								class="notes-page__filter"
								:search-input="false"
								:ui="assetModalSelectMenuUi" />
							<USelectMenu
								v-model="selectedFavoriteFilter"
								:items="favoriteOptions"
								value-key="value"
								label-key="label"
								size="sm"
								class="notes-page__filter"
								:search-input="false"
								:ui="assetModalSelectMenuUi" />
						</div>
						<div class="notes-page__sidebar-stats">
							<UBadge
								color="neutral"
								variant="soft"
								size="sm">
								{{ filteredNotes.length }} {{ t('assets.notes.labels.items') }}
							</UBadge>
							<UBadge
								color="warning"
								variant="soft"
								size="sm">
								{{ favoriteCount }} {{ t('assets.notes.labels.favorites') }}
							</UBadge>
							<UButton
								v-if="hasActiveFilters"
								color="neutral"
								variant="ghost"
								size="xs"
								icon="i-lucide-filter-x"
								@click="resetFilters">
								{{ t('assets.notes.actions.clearFilters') }}
							</UButton>
						</div>
					</div>

					<div
						v-if="showLoadErrorState"
						class="notes-page__sidebar-state">
						<AssetLibraryEmptyState
							icon="i-lucide-triangle-alert"
							:title="t('assets.notes.toast.loadFailedTitle')"
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
						v-else-if="filteredNotes.length === 0"
						class="notes-page__sidebar-state">
						<AssetLibraryEmptyState
							icon="i-lucide-notebook-tabs"
							:title="t('assets.notes.emptyTitle')"
							:description="hasActiveFilters ? t('assets.notes.emptyFilteredDescription') : t('assets.notes.emptyIdleDescription')">
							<template #action>
								<UButton
									v-if="hasActiveFilters"
									color="neutral"
									variant="soft"
									size="sm"
									icon="i-lucide-filter-x"
									@click="resetFilters">
									{{ t('assets.notes.actions.clearFilters') }}
								</UButton>
								<UButton
									v-else
									color="primary"
									size="sm"
									icon="i-lucide-plus"
									@click="onCreateNew">
									{{ t('assets.notes.actions.createFirst') }}
								</UButton>
							</template>
						</AssetLibraryEmptyState>
					</div>

					<div
						v-else
						class="notes-page__list">
						<article
							v-for="(note, index) in filteredNotes"
							:key="note.id"
							v-motion="noteItemMotions[index]"
							class="notes-page__card"
							:class="selectedNote?.id === note.id ? 'notes-page__card--active' : ''"
							@click="openEditor(note)">
							<div class="notes-page__card-header">
								<div class="notes-page__card-meta">
									<h3 class="notes-page__card-title">
										{{ note.title || t('assets.common.untitled') }}
									</h3>
									<div class="notes-page__card-time">
										{{ formatNoteDate(note.updatedAt) }}
									</div>
								</div>
								<AssetCardActions
									:favorite="note.favorite"
									:show-copy="false"
									@favorite="onToggleFavorite(note)" />
							</div>

							<p class="notes-page__card-preview">
								{{ notePreview(note.content) || t('assets.notes.labels.noPreview') }}
							</p>

							<div
								v-if="note.tags.length"
								class="notes-page__card-tags">
								<UBadge
									v-for="tag in note.tags.slice(0, 3)"
									:key="tag"
									color="neutral"
									variant="subtle"
									size="sm">
									#{{ tag }}
								</UBadge>
							</div>

							<div class="notes-page__card-links">
								<UBadge
									v-if="note.linkedProjectId"
									color="primary"
									variant="soft"
									size="sm">
									Project
								</UBadge>
								<UBadge
									v-if="note.linkedTaskId"
									color="success"
									variant="soft"
									size="sm">
									Task
								</UBadge>
							</div>
						</article>
					</div>
				</div>
			</template>

			<template #editor>
				<div
					v-if="selectedNote"
					class="notes-editor">
					<div class="notes-editor__meta">
						<UFormField
							:label="t('assets.notes.fields.title')"
							required>
							<UInput
								v-model="editForm.title"
								:placeholder="t('assets.notes.placeholders.title')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>

						<div class="notes-editor__meta-grid">
							<UFormField :label="t('assets.notes.fields.tagsOptional')">
								<UInput
									v-model="tagsInput"
									:placeholder="t('assets.notes.placeholders.tags')"
									size="md"
									class="w-full"
									:ui="assetModalInputUi"
									@blur="onTagsBlur" />
							</UFormField>
							<UFormField :label="t('assets.notes.fields.linkedProjectOptional')">
								<UInput
									v-model="editForm.linkedProjectId"
									:placeholder="t('assets.notes.placeholders.linkedProject')"
									size="md"
									class="w-full"
									:ui="assetModalInputUi" />
							</UFormField>
							<UFormField :label="t('assets.notes.fields.linkedTaskOptional')">
								<UInput
									v-model="editForm.linkedTaskId"
									:placeholder="t('assets.notes.placeholders.linkedTask')"
									size="md"
									class="w-full"
									:ui="assetModalInputUi" />
							</UFormField>
						</div>

						<div class="notes-editor__actions">
							<UButton
								color="neutral"
								variant="ghost"
								size="sm"
								:icon="editForm.favorite ? 'i-lucide-star' : 'i-lucide-star-off'"
								@click="editForm.favorite = !editForm.favorite">
								{{ editForm.favorite ? t('assets.notes.actions.unfavorite') : t('assets.notes.actions.favorite') }}
							</UButton>
							<UButton
								v-if="editForm.linkedProjectId"
								color="neutral"
								variant="ghost"
								size="sm"
								icon="i-lucide-folder-open"
								@click="openLinkedProject">
								{{ t('assets.notes.actions.openProject') }}
							</UButton>
							<UButton
								v-if="editForm.linkedTaskId"
								color="neutral"
								variant="ghost"
								size="sm"
								icon="i-lucide-list-todo"
								@click="openLinkedTask">
								{{ t('assets.notes.actions.openTask') }}
							</UButton>
							<UButton
								color="neutral"
								variant="ghost"
								size="sm"
								icon="i-lucide-save"
								@click="onSave">
								{{ t('common.actions.save') }}
							</UButton>
							<UButton
								v-if="selectedNote.id"
								color="error"
								variant="ghost"
								size="sm"
								icon="i-lucide-trash-2"
								@click="onDelete(selectedNote.id)">
								{{ t('common.actions.delete') }}
							</UButton>
						</div>
					</div>

					<AssetEditorSurface
						v-model="editForm.content"
						mode="markdown"
						:label="t('assets.notes.fields.contentMarkdown')"
						:placeholder="t('assets.notes.placeholders.content')"
						min-height="34rem" />
				</div>

				<div
					v-else
					class="notes-page__main-state">
					<AssetLibraryEmptyState
						icon="i-lucide-file-pen-line"
						:title="t('assets.notes.labels.noSelectionTitle')"
						:description="t('assets.notes.labels.noSelectionDescription')">
						<template #action>
							<UButton
								color="primary"
								size="sm"
								icon="i-lucide-plus"
								@click="onCreateNew">
								{{ t('assets.notes.actions.createFirst') }}
							</UButton>
						</template>
					</AssetLibraryEmptyState>
				</div>
			</template>

			<template #preview>
				<div
					v-if="selectedNote"
					class="notes-preview">
					<div class="notes-preview__meta">
						<div class="notes-preview__meta-top">
							<h2 class="notes-preview__title">
								{{ editForm.title || t('assets.common.untitled') }}
							</h2>
							<div class="notes-preview__time">
								{{ selectedNote ? formatNoteDate(selectedNote.updatedAt) : '' }}
							</div>
						</div>
						<div class="notes-preview__chips">
							<UBadge
								v-if="editForm.favorite"
								color="warning"
								variant="soft"
								size="sm">
								{{ t('assets.notes.labels.favorite') }}
							</UBadge>
							<UBadge
								v-for="tag in editForm.tags"
								:key="tag"
								color="neutral"
								variant="subtle"
								size="sm">
								#{{ tag }}
							</UBadge>
						</div>
						<div class="notes-preview__links">
							<UButton
								v-if="editForm.linkedProjectId"
								color="neutral"
								variant="soft"
								size="sm"
								icon="i-lucide-folder-open"
								@click="openLinkedProject">
								{{ editForm.linkedProjectId }}
							</UButton>
							<UButton
								v-if="editForm.linkedTaskId"
								color="neutral"
								variant="soft"
								size="sm"
								icon="i-lucide-list-todo"
								@click="openLinkedTask">
								{{ editForm.linkedTaskId }}
							</UButton>
						</div>
					</div>

					<AssetMarkdownPreview :source="editForm.content" />
				</div>

				<div
					v-else
					class="notes-page__main-state">
					<AssetLibraryEmptyState
						icon="i-lucide-panel-right-open"
						:title="t('assets.notes.labels.noSelectionTitle')"
						:description="t('assets.notes.labels.noSelectionDescription')" />
				</div>
			</template>
		</AssetDocumentWorkspace>
	</section>
</template>

<script setup lang="ts">
	import { useRouteMetaShellBreadcrumb } from '@/app/shell-header'
	import {
		AssetCardActions,
		AssetDocumentWorkspace,
		AssetEditorSurface,
		AssetLibraryEmptyState,
		AssetMarkdownPreview,
		assetModalInputUi,
		assetModalSelectMenuUi,
		useAssetsNotesPageFacade,
	} from '@/features/assets'

	useRouteMetaShellBreadcrumb('assets-notes-page')

	const {
		t,
		workspaceMotion,
		loadErrorMessage,
		showLoadErrorState,
		selectedNote,
		searchKeyword,
		selectedTag,
		selectedFavoriteFilter,
		workspaceMode,
		editForm,
		tagsInput,
		tagOptions,
		favoriteOptions,
		hasActiveFilters,
		favoriteCount,
		filteredNotes,
		saveIndicator,
		noteItemMotions,
		formatNoteDate,
		notePreview,
		onTagsBlur,
		openEditor,
		onCreateNew,
		resetFilters,
		refresh,
		onSave,
		onDelete,
		onToggleFavorite,
		openLinkedProject,
		openLinkedTask,
	} = useAssetsNotesPageFacade()
</script>

<style scoped>
	.notes-page {
		height: 100%;
		min-height: 0;
	}

	.notes-page__sidebar {
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr);
		gap: 0.9rem;
		height: 100%;
		min-height: 0;
	}

	.notes-page__sidebar-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.notes-page__sidebar-title {
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: rgb(15 23 42);
	}

	.notes-page__sidebar-description {
		margin-top: 0.24rem;
		font-size: 0.76rem;
		line-height: 1.55;
		color: rgb(71 85 105);
	}

	.notes-page__sidebar-controls {
		display: grid;
		gap: 0.75rem;
	}

	.notes-page__sidebar-filters,
	.notes-page__sidebar-stats {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.notes-page__filter {
		min-width: 8rem;
	}

	.notes-page__sidebar-state,
	.notes-page__main-state {
		display: grid;
		align-content: start;
	}

	.notes-page__list {
		display: grid;
		gap: 0.75rem;
		min-height: 0;
		overflow-y: auto;
		padding-right: 0.15rem;
	}

	.notes-page__card {
		display: grid;
		gap: 0.7rem;
		padding: 0.9rem;
		border: 1px solid rgb(203 213 225 / 0.8);
		border-radius: 1.35rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.97), rgb(248 250 252 / 0.94)),
			radial-gradient(circle at top right, rgb(244 114 182 / 0.12), transparent 32%);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.85),
			0 14px 30px rgb(15 23 42 / 0.06);
		cursor: pointer;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			box-shadow 160ms ease;
	}

	.notes-page__card:hover {
		transform: translateY(-1px);
		border-color: rgb(244 114 182 / 0.45);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.88),
			0 18px 36px rgb(131 24 67 / 0.1);
	}

	.notes-page__card--active {
		border-color: rgb(236 72 153 / 0.55);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.88),
			0 18px 36px rgb(131 24 67 / 0.14);
	}

	.notes-page__card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.notes-page__card-meta {
		min-width: 0;
		display: grid;
		gap: 0.3rem;
	}

	.notes-page__card-title {
		font-size: 0.9rem;
		font-weight: 700;
		color: rgb(15 23 42);
	}

	.notes-page__card-time {
		font-size: 0.72rem;
		color: rgb(100 116 139);
	}

	.notes-page__card-preview {
		font-size: 0.78rem;
		line-height: 1.65;
		color: rgb(71 85 105);
	}

	.notes-page__card-tags,
	.notes-page__card-links {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

	.notes-editor,
	.notes-preview {
		display: grid;
		gap: 0.9rem;
		height: 100%;
		min-height: 0;
	}

	.notes-editor__meta,
	.notes-preview__meta {
		display: grid;
		gap: 0.9rem;
		padding: 1rem 1.05rem;
		border: 1px solid rgb(226 232 240 / 0.9);
		border-radius: 1.45rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.97), rgb(248 250 252 / 0.94)),
			radial-gradient(circle at top right, rgb(244 114 182 / 0.1), transparent 36%);
	}

	.notes-editor__meta-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.notes-editor__actions,
	.notes-preview__chips,
	.notes-preview__links {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.notes-preview__meta-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.notes-preview__title {
		font-size: 1.12rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: rgb(15 23 42);
	}

	.notes-preview__time {
		font-size: 0.74rem;
		color: rgb(100 116 139);
	}

	@media (max-width: 1180px) {
		.notes-editor__meta-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 960px) {
		.notes-page__filter {
			min-width: 100%;
		}

		.notes-preview__meta-top {
			flex-direction: column;
		}
	}
</style>
