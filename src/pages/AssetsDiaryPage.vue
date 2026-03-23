<template>
	<section class="diary-page">
		<AssetDocumentWorkspace
			v-motion="workspaceMotion"
			v-model:mode="workspaceMode"
			:title="composedTitle"
			:description="currentDiarySummary">
			<template #sidebar>
				<div class="diary-page__sidebar">
					<div class="diary-page__sidebar-header">
						<div>
							<div class="diary-page__sidebar-title">{{ t('assets.diary.title') }}</div>
							<div class="diary-page__sidebar-description">{{ t('assets.diary.subtitle') }}</div>
						</div>
						<div class="diary-page__sidebar-actions">
							<UButton
								color="neutral"
								variant="soft"
								size="sm"
								icon="i-lucide-calendar-days"
								@click="onCreateToday">
								{{ t('assets.diary.actions.todayShortcut') }}
							</UButton>
							<UButton
								color="primary"
								size="sm"
								icon="i-lucide-plus"
								@click="onCreateNew">
								{{ t('assets.diary.newAction') }}
							</UButton>
						</div>
					</div>

					<div
						v-if="showLoadErrorState"
						class="diary-page__sidebar-state">
						<AssetLibraryEmptyState
							icon="i-lucide-triangle-alert"
							:title="t('assets.diary.toast.loadFailedTitle')"
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
						v-else-if="diaryEntries.length === 0"
						class="diary-page__sidebar-state">
						<AssetLibraryEmptyState
							icon="i-lucide-book-open-text"
							:title="t('assets.diary.emptyTitle')"
							:description="t('assets.diary.emptyDescription')">
							<template #action>
								<UButton
									color="primary"
									size="sm"
									icon="i-lucide-plus"
									@click="onCreateToday">
									{{ t('assets.diary.actions.createToday') }}
								</UButton>
							</template>
						</AssetLibraryEmptyState>
					</div>

					<div
						v-else
						class="diary-page__list">
						<article
							v-for="(entry, index) in diaryEntries"
							:key="entry.id"
							v-motion="diaryItemMotions[index]"
							class="diary-page__card"
							:class="selectedEntry?.id === entry.id ? 'diary-page__card--active' : ''"
							@click="selectEntry(entry)">
							<div class="diary-page__card-date">
								{{ formatDiaryDate(entry.date) }}
							</div>
							<div class="diary-page__card-title">
								{{ entry.subtitle || t('assets.diary.labels.defaultSubtitle') }}
							</div>
							<p class="diary-page__card-preview">
								{{ entryPreview(entry.content) || t('assets.diary.labels.noPreview') }}
							</p>
							<div class="diary-page__card-footer">
								<UBadge
									v-if="entry.linkedTaskIds.length > 0"
									color="success"
									variant="soft"
									size="sm">
									{{ t('assets.diary.tasksCount', { count: entry.linkedTaskIds.length }) }}
								</UBadge>
								<UBadge
									v-if="entry.linkedProjectId"
									color="primary"
									variant="soft"
									size="sm">
									Project
								</UBadge>
							</div>
						</article>
					</div>
				</div>
			</template>

			<template #editor>
				<div class="diary-editor">
					<div class="diary-editor__meta">
						<div class="diary-editor__meta-grid">
							<UFormField :label="t('assets.diary.fields.date')">
								<UInput
									v-model="editForm.date"
									type="date"
									size="md"
									class="w-full"
									:ui="assetModalInputUi" />
							</UFormField>

							<UFormField :label="t('assets.diary.fields.titlePrefix')">
								<UInput
									:model-value="selectedDateTitlePrefix"
									size="md"
									class="w-full"
									readonly
									:ui="assetModalInputUi" />
							</UFormField>

							<UFormField :label="t('assets.diary.fields.subtitle')">
								<UInput
									v-model="editForm.subtitle"
									:placeholder="t('assets.diary.placeholders.subtitle')"
									size="md"
									class="w-full"
									:ui="assetModalInputUi" />
							</UFormField>

							<UFormField :label="t('assets.diary.fields.linkedProjectOptional')">
								<UInput
									v-model="editForm.linkedProjectId"
									:placeholder="t('assets.diary.placeholders.linkedProject')"
									size="md"
									class="w-full"
									:ui="assetModalInputUi" />
							</UFormField>
						</div>

						<div class="diary-editor__actions">
							<UButton
								color="neutral"
								variant="ghost"
								size="sm"
								icon="i-lucide-columns-3"
								@click="goToWorkspace">
								{{ t('assets.diary.actions.openWorkspace') }}
							</UButton>
							<UButton
								color="neutral"
								variant="ghost"
								size="sm"
								icon="i-lucide-list-checks"
								@click="goToFinishList">
								{{ t('assets.diary.actions.openFinishList') }}
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
								v-if="selectedEntry?.id"
								color="error"
								variant="ghost"
								size="sm"
								icon="i-lucide-trash-2"
								@click="onDelete(selectedEntry.id)">
								{{ t('common.actions.delete') }}
							</UButton>
						</div>
					</div>

					<div class="diary-editor__context">
						<div class="diary-editor__context-header">
							<div class="diary-editor__context-title">{{ t('assets.diary.dayTasks') }}</div>
							<UBadge
								color="success"
								variant="soft"
								size="sm">
								{{ t('assets.diary.tasksCount', { count: selectedDateTasks.length }) }}
							</UBadge>
						</div>
						<div
							v-if="selectedDateTasks.length"
							class="diary-editor__context-tasks">
							<UBadge
								v-for="task in selectedDateTasks"
								:key="task.id"
								color="success"
								variant="subtle"
								size="sm"
								class="cursor-pointer"
								@click="goToFinishList">
								{{ task.title }}
							</UBadge>
						</div>
						<div
							v-else
							class="diary-editor__context-empty">
							{{ t('assets.diary.labels.noTasks') }}
						</div>
					</div>

					<AssetEditorSurface
						v-model="editForm.content"
						mode="markdown"
						:label="t('assets.diary.fields.contentMarkdown')"
						:placeholder="t('assets.diary.placeholders.content')"
						min-height="34rem" />
				</div>
			</template>

			<template #preview>
				<div class="diary-preview">
					<div class="diary-preview__meta">
						<div class="diary-preview__top">
							<div>
								<div class="diary-preview__title">{{ composedTitle }}</div>
								<div class="diary-preview__date">{{ formatDiaryDate(editForm.date) }}</div>
							</div>
							<div class="diary-preview__actions">
								<UButton
									color="neutral"
									variant="soft"
									size="sm"
									icon="i-lucide-columns-3"
									@click="goToWorkspace">
									{{ t('assets.diary.actions.openWorkspace') }}
								</UButton>
								<UButton
									color="neutral"
									variant="soft"
									size="sm"
									icon="i-lucide-list-checks"
									@click="goToFinishList">
									{{ t('assets.diary.actions.openFinishList') }}
								</UButton>
							</div>
						</div>

						<div class="diary-preview__tasks">
							<UBadge
								v-for="task in selectedDateTasks"
								:key="task.id"
								color="success"
								variant="subtle"
								size="sm"
								class="cursor-pointer"
								@click="goToFinishList">
								{{ task.title }}
							</UBadge>
							<span
								v-if="selectedDateTasks.length === 0"
								class="diary-preview__empty">
								{{ t('assets.diary.labels.noTasks') }}
							</span>
						</div>
					</div>

					<AssetMarkdownPreview :source="editForm.content" />
				</div>
			</template>
		</AssetDocumentWorkspace>
	</section>
</template>

<script setup lang="ts">
	import { useRouteMetaShellBreadcrumb } from '@/app/shell-header'
	import {
		AssetDocumentWorkspace,
		AssetEditorSurface,
		AssetLibraryEmptyState,
		AssetMarkdownPreview,
		assetModalInputUi,
		useAssetsDiaryPageFacade,
	} from '@/features/assets'

	useRouteMetaShellBreadcrumb('assets-diary-page')

	const {
		t,
		workspaceMotion,
		loadErrorMessage,
		showLoadErrorState,
		selectedEntry,
		workspaceMode,
		editForm,
		diaryEntries,
		selectedDateTasks,
		selectedDateTitlePrefix,
		composedTitle,
		currentDiarySummary,
		diaryItemMotions,
		formatDiaryDate,
		entryPreview,
		refresh,
		selectEntry,
		onCreateNew,
		onCreateToday,
		onSave,
		onDelete,
		goToFinishList,
		goToWorkspace,
	} = useAssetsDiaryPageFacade()
</script>

<style scoped>
	.diary-page {
		height: 100%;
		min-height: 0;
	}

	.diary-page__sidebar {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.9rem;
		height: 100%;
		min-height: 0;
	}

	.diary-page__sidebar-header {
		display: grid;
		gap: 0.8rem;
	}

	.diary-page__sidebar-title {
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: rgb(15 23 42);
	}

	.diary-page__sidebar-description {
		margin-top: 0.24rem;
		font-size: 0.76rem;
		line-height: 1.55;
		color: rgb(71 85 105);
	}

	.diary-page__sidebar-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.diary-page__sidebar-state {
		display: grid;
		align-content: start;
	}

	.diary-page__list {
		display: grid;
		gap: 0.75rem;
		min-height: 0;
		overflow-y: auto;
		padding-right: 0.1rem;
	}

	.diary-page__card {
		display: grid;
		gap: 0.65rem;
		padding: 0.9rem;
		border: 1px solid rgb(203 213 225 / 0.8);
		border-radius: 1.35rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.97), rgb(248 250 252 / 0.94)),
			radial-gradient(circle at top right, rgb(129 140 248 / 0.14), transparent 34%);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.85),
			0 14px 30px rgb(15 23 42 / 0.06);
		cursor: pointer;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			box-shadow 160ms ease;
	}

	.diary-page__card:hover {
		transform: translateY(-1px);
		border-color: rgb(99 102 241 / 0.45);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.88),
			0 18px 36px rgb(49 46 129 / 0.1);
	}

	.diary-page__card--active {
		border-color: rgb(99 102 241 / 0.55);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.88),
			0 18px 36px rgb(49 46 129 / 0.14);
	}

	.diary-page__card-date {
		font-size: 0.76rem;
		font-weight: 700;
		color: rgb(79 70 229);
	}

	.diary-page__card-title {
		font-size: 0.92rem;
		font-weight: 700;
		color: rgb(15 23 42);
	}

	.diary-page__card-preview {
		font-size: 0.78rem;
		line-height: 1.65;
		color: rgb(71 85 105);
	}

	.diary-page__card-footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

	.diary-editor,
	.diary-preview {
		display: grid;
		gap: 0.9rem;
		height: 100%;
		min-height: 0;
	}

	.diary-editor__meta,
	.diary-editor__context,
	.diary-preview__meta {
		display: grid;
		gap: 0.85rem;
		padding: 1rem 1.05rem;
		border: 1px solid rgb(226 232 240 / 0.9);
		border-radius: 1.45rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.97), rgb(248 250 252 / 0.94)),
			radial-gradient(circle at top right, rgb(129 140 248 / 0.12), transparent 34%);
	}

	.diary-editor__meta-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.diary-editor__actions,
	.diary-editor__context-tasks,
	.diary-preview__actions,
	.diary-preview__tasks {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.diary-editor__context-header,
	.diary-preview__top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.diary-editor__context-title,
	.diary-preview__title {
		font-size: 0.95rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: rgb(15 23 42);
	}

	.diary-editor__context-empty,
	.diary-preview__empty,
	.diary-preview__date {
		font-size: 0.76rem;
		line-height: 1.6;
		color: rgb(100 116 139);
	}

	@media (max-width: 1180px) {
		.diary-editor__meta-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 960px) {
		.diary-editor__meta-grid {
			grid-template-columns: 1fr;
		}

		.diary-editor__context-header,
		.diary-preview__top {
			flex-direction: column;
		}
	}
</style>
