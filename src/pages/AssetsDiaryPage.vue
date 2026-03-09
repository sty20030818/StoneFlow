<template>
	<section class="h-full flex flex-col">
		<!-- 顶部：标题 + 新建 -->
		<header
			v-motion="headerMotion"
			class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-default">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-sm font-semibold">
					<UIcon
						name="i-lucide-book-open-text"
						class="text-indigo-500" />
					<span>{{ t('assets.diary.title') }}</span>
				</div>
				<div class="text-xs text-muted">{{ t('assets.diary.subtitle') }}</div>
			</div>

			<UButton
				color="primary"
				size="sm"
				icon="i-lucide-plus"
				@click="onCreateNew">
				{{ t('assets.diary.newAction') }}
			</UButton>
		</header>

		<!-- 主体：时间序列列表 -->
		<main
			v-motion="timelineMotion"
			class="flex-1 min-h-0 overflow-y-auto mt-4">
			<div
				v-if="groupedEntries.length === 0 && !loading"
				class="text-sm text-muted py-8 text-center">
				{{ t('assets.diary.empty') }}
			</div>

			<div
				v-else
				class="space-y-6">
				<div
					v-for="group in groupedEntries"
					:key="group.date">
					<div class="flex items-center gap-3 mb-3">
						<div class="text-sm font-semibold">{{ group.dateLabel }}</div>
						<div class="flex-1 border-t border-default" />
						<UBadge
							color="neutral"
							variant="soft"
							size="xs">
							{{ t('assets.diary.entriesCount', { count: group.entries.length }) }}
						</UBadge>
					</div>

					<div class="space-y-3">
						<UCard
							v-for="(e, index) in group.entries"
							:key="e.id"
							v-motion="getDiaryItemMotion(index)"
							class="cursor-pointer hover:bg-default transition"
							@click="selectEntry(e)">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2 mb-1.5">
										<span class="text-sm font-medium">{{ e.title || t('assets.common.untitled') }}</span>
										<UBadge
											v-if="e.linkedProjectId"
											color="primary"
											variant="soft"
											size="2xs">
											Project
										</UBadge>
										<UBadge
											v-if="e.linkedTaskIds.length > 0"
											color="success"
											variant="soft"
											size="2xs">
											{{ t('assets.diary.tasksCount', { count: e.linkedTaskIds.length }) }}
										</UBadge>
									</div>
									<div class="text-xs text-muted line-clamp-3 mb-2">
										{{ e.content }}
									</div>
									<div
										v-if="group.tasks.length > 0"
										class="mt-2 pt-2 border-t border-default/60">
										<div class="text-[11px] text-muted mb-1">{{ t('assets.diary.dayTasks') }}</div>
										<div class="flex flex-wrap gap-1.5">
											<UBadge
												v-for="t in group.tasks"
												:key="t.id"
												color="success"
												variant="subtle"
												size="2xs"
												class="cursor-pointer"
												@click.stop="goToFinishList">
												{{ t.title }}
											</UBadge>
										</div>
									</div>
								</div>
								<UButton
									color="neutral"
									variant="ghost"
									size="2xs"
									icon="i-lucide-trash-2"
									@click.stop="onDelete(e.id)">
									<span class="sr-only">{{ t('common.actions.delete') }}</span>
								</UButton>
							</div>
						</UCard>
					</div>
				</div>
			</div>
		</main>

		<!-- 编辑模态框 -->
		<UModal
			v-model:open="editOpen"
			:title="selectedEntry ? t('assets.diary.modal.editTitle') : t('assets.diary.modal.newTitle')"
			:description="t('assets.diary.modal.description')"
			:ui="diaryModalUi">
			<template #body>
				<div
					v-motion="modalBodyMotion"
					class="space-y-4">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<UFormField :label="t('assets.diary.fields.date')">
							<UInput
								v-model="editForm.date"
								type="date"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>
						<UFormField
							:label="t('assets.diary.fields.title')"
							required>
							<UInput
								v-model="editForm.title"
								:placeholder="t('assets.diary.placeholders.title')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
						</UFormField>
					</div>

					<UFormField
						:label="t('assets.diary.fields.contentMarkdown')"
						required>
						<UTextarea
							v-model="editForm.content"
							:placeholder="t('assets.diary.placeholders.content')"
							:rows="14"
							size="md"
							class="w-full"
							autoresize
							:ui="assetModalTextareaUi" />
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
			</template>
			<template #footer>
				<div
					v-motion="modalFooterMotion"
					class="flex items-center justify-end gap-2">
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
						@click="onSave">
						{{ t('common.actions.save') }}
					</UButton>
				</div>
			</template>
		</UModal>
	</section>
</template>

<script setup lang="ts">
	import { assetModalInputUi, assetModalTextareaUi, useAssetsDiaryPageFacade } from '@/features/assets'

	const {
		t,
		headerMotion,
		timelineMotion,
		modalBodyMotion,
		modalFooterMotion,
		loading,
		selectedEntry,
		editOpen,
		editForm,
		groupedEntries,
		diaryModalUi,
		selectEntry,
		onCreateNew,
		closeEditor,
		onSave,
		onDelete,
		goToFinishList,
		getDiaryItemMotion,
	} = useAssetsDiaryPageFacade()
</script>
