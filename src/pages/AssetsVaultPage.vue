<template>
	<section class="h-full flex flex-col">
		<!-- 顶部：标题 + 搜索 + 新建 -->
		<header
			v-motion="headerMotion"
			class="flex flex-col gap-3 border-b border-default pb-3 lg:flex-row lg:items-center lg:justify-between">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-sm font-semibold">
					<UIcon
						name="i-lucide-lock"
						class="text-yellow-500" />
					<span>{{ t('assets.vault.title') }}</span>
				</div>
				<div class="text-xs text-muted">{{ t('assets.vault.subtitle') }}</div>
			</div>

			<div class="flex items-center gap-2">
				<UInput
					v-model="searchKeyword"
					icon="i-lucide-search"
					:placeholder="t('assets.vault.searchPlaceholder')"
					size="sm"
					class="w-64" />

				<UButton
					color="primary"
					size="sm"
					icon="i-lucide-plus"
					@click="onCreateNew">
					{{ t('common.actions.new') }}
				</UButton>
			</div>
		</header>

		<!-- 主体：左侧分组 + 列表 -->
		<div
			v-motion="layoutMotion"
			class="mt-4 flex flex-1 min-h-0 gap-4">
			<aside
				v-motion="folderMotion"
				class="w-48 shrink-0 border-r border-default pr-4">
				<div class="space-y-2">
					<button
						type="button"
						class="w-full rounded-lg px-2 py-1.5 text-left text-sm transition"
						:class="selectedFolder === null ? 'bg-elevated text-default' : 'text-muted hover:bg-elevated/60'"
						@click="selectedFolder = null">
						<div class="flex items-center gap-2">
							<UIcon
								name="i-lucide-folder"
								class="size-4" />
							<span>{{ t('assets.vault.allItems') }}</span>
						</div>
					</button>

					<div
						v-for="folder in folders"
						:key="folder"
						class="space-y-0.5">
						<button
							type="button"
							class="w-full rounded-lg px-2 py-1.5 text-left text-sm transition"
							:class="selectedFolder === folder ? 'bg-elevated text-default' : 'text-muted hover:bg-elevated/60'"
							@click="selectedFolder = folder">
							<div class="flex items-center gap-2">
								<UIcon
									name="i-lucide-folder-open"
									class="size-4" />
								<span class="truncate">{{ folder }}</span>
							</div>
						</button>
					</div>
				</div>
			</aside>

			<main
				v-motion="listMotion"
				class="flex-1 min-w-0 overflow-y-auto">
				<div
					v-if="filteredEntries.length === 0 && !loading"
					class="py-8 text-center text-sm text-muted">
					{{ t('assets.vault.empty') }}
				</div>

				<div
					v-else
					class="space-y-2">
					<div
						v-for="(entry, index) in filteredEntries"
						:key="entry.id"
						v-motion="entryItemMotions[index]"
						class="cursor-pointer rounded-lg border border-default bg-elevated/80 p-3 transition hover:bg-default"
						:class="selectedEntry?.id === entry.id && editOpen ? 'ring-2 ring-primary' : ''"
						@click="openEditor(entry)">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="mb-1 flex items-center gap-2">
									<span class="truncate text-sm font-medium">{{ entry.name }}</span>
									<UBadge
										color="neutral"
										variant="soft"
										size="2xs">
										{{ typeLabel(entry.type) }}
									</UBadge>
									<UBadge
										v-if="entry.folder"
										color="primary"
										variant="soft"
										size="2xs">
										{{ entry.folder }}
									</UBadge>
								</div>
								<div class="line-clamp-1 text-xs text-muted">
									{{ entry.value.substring(0, 30) }}{{ entry.value.length > 30 ? '...' : '' }}
								</div>
								<div
									v-if="entry.note"
									class="mt-1 line-clamp-1 text-xs text-muted">
									{{ entry.note }}
								</div>
							</div>
							<UButton
								color="neutral"
								variant="ghost"
								size="2xs"
								icon="i-lucide-trash-2"
								@click.stop="onDelete(entry.id)">
								<span class="sr-only">{{ t('common.actions.delete') }}</span>
							</UButton>
						</div>
					</div>
				</div>
			</main>
		</div>

		<UModal
			v-model:open="editOpen"
			:title="selectedEntry?.id ? t('assets.vault.modal.editTitle') : t('assets.vault.modal.newTitle')"
			:description="t('assets.vault.modal.description')"
			:ui="vaultModalUi">
			<template #body>
				<div
					v-motion="modalBodyMotion"
					class="space-y-4">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
					</div>

					<UFormField :label="t('assets.vault.fields.folderOptional')">
						<UInput
							v-model="editForm.folder"
							:placeholder="t('assets.vault.placeholders.folderOptional')"
							size="md"
							class="w-full"
							:ui="assetModalInputUi" />
					</UFormField>

					<UFormField
						:label="t('assets.vault.fields.value')"
						required>
						<div class="relative">
							<UInput
								v-model="editForm.value"
								:type="showValue ? 'text' : 'password'"
								:placeholder="t('assets.vault.placeholders.value')"
								size="md"
								class="w-full"
								:ui="assetModalInputUi" />
							<UButton
								color="neutral"
								variant="ghost"
								size="2xs"
								:icon="showValue ? 'i-lucide-eye-off' : 'i-lucide-eye'"
								class="absolute top-1/2 right-1 -translate-y-1/2"
								@click="showValue = !showValue">
								<span class="sr-only">{{ t('assets.vault.toggleSensitive') }}</span>
							</UButton>
						</div>
					</UFormField>

					<UFormField :label="t('assets.vault.fields.noteOptional')">
						<UTextarea
							v-model="editForm.note"
							:placeholder="t('assets.vault.placeholders.noteOptional')"
							:rows="3"
							size="md"
							class="w-full"
							autoresize
							:ui="assetModalTextareaUi" />
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
						variant="soft"
						size="sm"
						icon="i-lucide-copy"
						@click="onCopy">
						{{ t('assets.vault.copyValueAction') }}
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
	import {
		assetModalInputUi,
		assetModalSelectMenuUi,
		assetModalTextareaUi,
		useAssetsVaultPageFacade,
	} from '@/features/assets'

	const {
		t,
		headerMotion,
		layoutMotion,
		folderMotion,
		listMotion,
		modalBodyMotion,
		modalFooterMotion,
		loading,
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
		vaultModalUi,
		entryItemMotions,
		openEditor,
		onCreateNew,
		closeEditor,
		onCopy,
		onSave,
		onDelete,
	} = useAssetsVaultPageFacade()
</script>
