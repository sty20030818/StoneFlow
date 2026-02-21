<template>
	<USlideover
		v-if="currentProject"
		v-model:open="isOpen"
		title="项目设置"
		description="查看并编辑当前项目信息"
		side="right"
		:ui="drawerUi"
		:close="false">
		<template #content>
			<div class="flex h-full flex-col">
				<header class="border-b border-default px-6 py-4">
					<div class="flex items-center justify-between gap-3">
						<div class="min-w-0 space-y-1">
							<p class="truncate text-sm font-semibold text-default">
								{{ currentProject.path }}
							</p>
							<p class="text-xs text-muted">Space: {{ currentProject.spaceId }}</p>
						</div>
						<div
							v-if="isSaveStateVisible"
							class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
							:class="saveStateClass">
							{{ saveStateLabel }}
						</div>
					</div>
				</header>

				<div class="flex-1 space-y-5 overflow-y-auto px-6 py-5">
					<section class="space-y-2">
						<label class="text-xs font-semibold text-muted">项目标题</label>
						<UInput
							v-model="titleLocal"
							:disabled="isStructureLocked"
							placeholder="请输入项目标题"
							size="lg"
							class="w-full"
							:ui="{ rounded: 'rounded-xl' }"
							@blur="onTitleBlur"
							@compositionstart="onTitleCompositionStart"
							@compositionend="onTitleCompositionEnd" />
						<p
							v-if="isStructureLocked"
							class="text-[11px] text-muted">
							Default Project 的标题与父级不可编辑。
						</p>
					</section>

					<section class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<UFormField label="优先级">
							<USelectMenu
								v-model="priorityLocal"
								:items="priorityOptions"
								value-key="value"
								label-key="label"
								size="md"
								class="w-full"
								:search-input="false"
								:ui="{ rounded: 'rounded-xl' }" />
						</UFormField>

						<UFormField label="父项目">
							<USelectMenu
								v-model="parentIdLocal"
								:items="parentOptions"
								value-key="value"
								label-key="label"
								size="md"
								class="w-full"
								:disabled="isStructureLocked"
								:search-input="false"
								:placeholder="rootLabel"
								:ui="{ rounded: 'rounded-xl' }">
								<template #item="{ item }">
									<div
										v-if="isParentOption(item)"
										class="py-0.5"
										:style="{ paddingLeft: `${item.depth * 14}px` }">
										<span class="truncate">{{ item.label }}</span>
									</div>
								</template>
							</USelectMenu>
						</UFormField>
					</section>

					<section class="space-y-2">
						<label class="text-xs font-semibold text-muted">标签</label>
						<div class="flex flex-wrap gap-2">
							<UBadge
								v-for="tag in tagsLocal"
								:key="tag"
								color="neutral"
								variant="soft"
								size="sm"
								class="cursor-pointer"
								@click="removeTag(tag)">
								#{{ tag }}
								<template #trailing>
									<UIcon
										name="i-lucide-x"
										class="ml-1 size-3" />
								</template>
							</UBadge>
						</div>
						<UInput
							v-model="tagInput"
							placeholder="输入标签后回车"
							size="sm"
							class="w-full"
							:ui="{ rounded: 'rounded-xl' }"
							@keydown.enter.prevent="addTag" />
					</section>

					<section class="space-y-2">
						<div class="flex items-center justify-between">
							<label class="text-xs font-semibold text-muted">关联链接</label>
							<UButton
								color="neutral"
								variant="soft"
								size="xs"
								icon="i-lucide-plus"
								@click="addLinkDraft">
								新增链接
							</UButton>
						</div>

						<div
							v-for="(link, index) in linksLocal"
							:key="link.id ?? `draft-${index}`"
							class="space-y-2 rounded-xl border border-default p-3">
							<div class="grid grid-cols-2 gap-2">
								<UInput
									v-model="link.title"
									placeholder="标题（可选）"
									size="xs"
									:ui="{ rounded: 'rounded-lg' }"
									@input="clearLinkValidationError(index)" />
								<USelectMenu
									v-model="link.kind"
									:items="linkKindOptions"
									value-key="value"
									label-key="label"
									size="xs"
									:search-input="false"
									:ui="{ rounded: 'rounded-lg' }" />
							</div>
							<div class="grid grid-cols-[1fr_auto] gap-2">
								<UInput
									v-model="link.url"
									placeholder="URL"
									size="xs"
									:ui="{ rounded: 'rounded-lg' }"
									@input="clearLinkValidationError(index)" />
								<UButton
									color="neutral"
									variant="ghost"
									size="xs"
									icon="i-lucide-trash-2"
									@click="removeLink(index)" />
							</div>
							<p
								v-if="linkValidationErrorIndex === index"
								class="text-[11px] text-error">
								URL 不能为空
							</p>
						</div>

						<div
							v-if="linkDraftVisible"
							class="space-y-2 rounded-xl border border-dashed border-default p-3">
							<div class="grid grid-cols-2 gap-2">
								<UInput
									v-model="linkDraftTitle"
									placeholder="标题（可选）"
									size="xs"
									:ui="{ rounded: 'rounded-lg' }" />
								<USelectMenu
									v-model="linkDraftKind"
									:items="linkKindOptions"
									value-key="value"
									label-key="label"
									size="xs"
									:search-input="false"
									:ui="{ rounded: 'rounded-lg' }" />
							</div>
							<div class="grid grid-cols-[1fr_auto] gap-2">
								<UInput
									v-model="linkDraftUrl"
									placeholder="URL（必填）"
									size="xs"
									:ui="{ rounded: 'rounded-lg' }" />
								<UButton
									color="primary"
									size="xs"
									@click="confirmLinkDraft">
									确认
								</UButton>
							</div>
						</div>
					</section>

					<section class="space-y-2">
						<label class="text-xs font-semibold text-muted">备注</label>
						<UTextarea
							v-model="noteLocal"
							:rows="4"
							placeholder="为项目补充更多上下文信息..."
							class="w-full"
							:ui="{ rounded: 'rounded-xl' }"
							@blur="onNoteBlur"
							@compositionstart="onNoteCompositionStart"
							@compositionend="onNoteCompositionEnd" />
					</section>
				</div>

				<footer class="flex items-center justify-between border-t border-default px-6 py-3">
					<div class="text-[11px] text-muted">
						创建于 {{ createdAtLabel }}
					</div>
					<UButton
						v-if="canRetrySave"
						color="error"
						variant="soft"
						size="xs"
						icon="i-lucide-rotate-cw"
						@click="onRetrySave">
						重试保存
					</UButton>
				</footer>
			</div>
		</template>
	</USlideover>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import { createDrawerLayerUi } from '@/config/ui-layer'
	import { useProjectInspectorDrawer } from './composables/useProjectInspectorDrawer'

	const {
		currentProject,
		isOpen,
		titleLocal,
		noteLocal,
		priorityLocal,
		parentIdLocal,
		tagsLocal,
		tagInput,
		linksLocal,
		linkDraftTitle,
		linkDraftUrl,
		linkDraftKind,
		linkDraftVisible,
		linkValidationErrorIndex,
		priorityOptions,
		parentOptions,
		linkKindOptions,
		rootLabel,
		isStructureLocked,
		isSaveStateVisible,
		canRetrySave,
		saveState,
		addTag,
		removeTag,
		addLinkDraft,
		confirmLinkDraft,
		removeLink,
		clearLinkValidationError,
		onTitleBlur,
		onTitleCompositionStart,
		onTitleCompositionEnd,
		onNoteBlur,
		onNoteCompositionStart,
		onNoteCompositionEnd,
		onRetrySave,
	} = useProjectInspectorDrawer()

	const drawerUi = createDrawerLayerUi({
		content:
			'w-[460px] max-w-[calc(100vw-1.5rem)] h-[calc(100%-1.5rem)] my-3 mr-3 flex flex-col rounded-3xl border border-default bg-default/92 backdrop-blur-2xl shadow-2xl overflow-hidden',
	})

	const saveStateLabel = computed(() => {
		if (saveState.value === 'saving') return '保存中'
		if (saveState.value === 'saved') return '已保存'
		if (saveState.value === 'error') return '保存失败'
		return ''
	})

	const saveStateClass = computed(() => {
		if (saveState.value === 'saving') return 'bg-blue-100 text-blue-700'
		if (saveState.value === 'saved') return 'bg-emerald-100 text-emerald-700'
		if (saveState.value === 'error') return 'bg-rose-100 text-rose-700'
		return 'bg-neutral-100 text-neutral-600'
	})

	const createdAtLabel = computed(() => {
		const timestamp = currentProject.value?.createdAt
		if (!timestamp) return '未知'
		const date = new Date(timestamp)
		const yyyy = date.getFullYear()
		const mm = String(date.getMonth() + 1).padStart(2, '0')
		const dd = String(date.getDate()).padStart(2, '0')
		const hh = String(date.getHours()).padStart(2, '0')
		const min = String(date.getMinutes()).padStart(2, '0')
		return `${yyyy}.${mm}.${dd} ${hh}:${min}`
	})

	function isParentOption(item: unknown): item is { value: string | null; label: string; depth: number } {
		return !!item && typeof item === 'object' && 'label' in item && 'depth' in item
	}
</script>
