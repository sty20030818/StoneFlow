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
							<p class="text-xs text-muted">空间：{{ currentProject.spaceId }}</p>
						</div>
						<div
							v-if="isSaveStateVisible"
							class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
							:class="saveStateClass">
							<span
								class="size-1.5 rounded-full"
								:class="saveStateDotClass"></span>
							{{ saveStateLabel }}
						</div>
					</div>
				</header>

				<div class="flex-1 space-y-5 overflow-y-auto px-6 py-5">
					<section class="space-y-3 rounded-2xl border border-default/80 bg-elevated/30 p-4">
						<div class="flex items-center justify-between">
							<p class="text-xs font-semibold text-muted">项目摘要</p>
							<UBadge
								size="sm"
								variant="soft"
								:color="statusBadgeColor">
								<span class="inline-flex items-center gap-1.5">
									<span
										class="size-1.5 rounded-full"
										:class="statusDotClass"></span>
									{{ statusLabel }}
								</span>
							</UBadge>
						</div>
						<div class="grid grid-cols-3 gap-2">
							<div class="rounded-xl border border-default/70 bg-default px-3 py-2">
								<div class="text-[11px] text-muted">待办任务</div>
								<div class="mt-1 text-base font-semibold text-default">{{ currentProject.todoTaskCount }}</div>
							</div>
							<div class="rounded-xl border border-default/70 bg-default px-3 py-2">
								<div class="text-[11px] text-muted">已完成任务</div>
								<div class="mt-1 text-base font-semibold text-default">{{ currentProject.doneTaskCount }}</div>
							</div>
							<div class="rounded-xl border border-default/70 bg-default px-3 py-2">
								<div class="text-[11px] text-muted">最近更新</div>
								<div class="mt-1 text-xs font-semibold text-default">{{ lastUpdatedLabel }}</div>
							</div>
						</div>
						<p class="text-[11px] text-muted">{{ shortcutHint }}</p>
					</section>

					<section class="space-y-2">
						<UInput
							v-model="titleLocal"
							:disabled="isStructureLocked"
							placeholder="请输入项目标题"
							size="xl"
							variant="none"
							:ui="{
								root: 'w-full',
								base: 'px-0 py-0 text-2xl font-semibold leading-tight bg-transparent border-none rounded-none focus:ring-0 placeholder:text-muted/40',
							}"
							autofocus
							@focus="onTitleFocus"
							@blur="onTitleBlur"
							@compositionstart="onTitleCompositionStart"
							@compositionend="onTitleCompositionEnd" />
						<p
							v-if="isStructureLocked"
							class="text-[11px] text-muted">
							默认项目的标题与父级不可编辑。
						</p>
					</section>

					<section class="space-y-2">
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">属性</label>
						<div class="grid grid-cols-2 gap-3">
							<UPopover
								v-model:open="priorityPopoverOpen"
								:mode="'click'"
								:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
								:ui="drawerPopoverUi">
								<button
									v-motion="optionCardHoverMotion"
									type="button"
									class="w-full cursor-pointer rounded-2xl border p-4 text-left transition-colors"
									:class="priorityCardClass">
									<div class="flex items-center gap-2.5">
										<UIcon
											:name="priorityIcon"
											class="size-4 shrink-0"
											:class="priorityIconClass" />
										<div class="min-w-0 flex-1">
											<div class="mb-1 text-[11px] text-muted">Priority</div>
											<div
												class="text-xs font-semibold"
												:class="priorityTextClass">
												{{ priorityLabel }}
											</div>
										</div>
									</div>
								</button>
								<template #content>
									<div class="min-w-[200px] p-2">
										<div
											v-for="opt in priorityOptions"
											:key="opt.value"
											class="cursor-pointer rounded-lg px-3 py-2 transition-colors hover:bg-elevated"
											:class="{ 'bg-elevated': priorityLocal === opt.value }"
											@click="onPrioritySelect(opt.value)">
											<div class="flex items-center gap-2">
												<UIcon
													:name="opt.icon"
													class="size-4 shrink-0"
													:class="opt.iconClass" />
												<span class="text-sm">{{ opt.label }}</span>
											</div>
										</div>
									</div>
								</template>
							</UPopover>

							<UPopover
								v-model:open="statusPopoverOpen"
								:mode="'click'"
								:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
								:ui="drawerPopoverUi">
								<button
									v-motion="optionCardHoverMotion"
									type="button"
									class="w-full rounded-2xl border p-4 text-left transition-colors"
									:class="[statusCardClass, statusActionAvailable ? 'cursor-pointer' : 'cursor-default']">
									<div class="flex items-center gap-2.5">
										<UIcon
											:name="statusIconName"
											class="size-4 shrink-0"
											:class="statusIconClass" />
										<div class="min-w-0 flex-1">
											<div class="mb-1 text-[11px] text-muted">Status</div>
											<div
												class="text-xs font-semibold"
												:class="statusTextClass">
												{{ statusLabel }}
											</div>
										</div>
									</div>
								</button>
								<template #content>
									<div class="min-w-[180px] space-y-1 p-2">
										<div
											v-if="canArchiveProject"
											class="rounded-lg px-3 py-2 transition-colors"
											:class="isLifecycleBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-elevated'"
											@click="!isLifecycleBusy && onStatusActionArchive()">
											<div class="flex items-center gap-2">
												<UIcon
													:name="isArchivingProject ? 'i-lucide-loader-circle' : 'i-lucide-archive'"
													class="size-4 shrink-0"
													:class="isArchivingProject ? 'animate-spin text-amber-500' : 'text-amber-500'" />
												<span class="text-sm">归档项目</span>
											</div>
										</div>
										<div
											v-if="canDeleteProject"
											class="rounded-lg px-3 py-2 transition-colors"
											:class="isLifecycleBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-elevated'"
											@click="!isLifecycleBusy && onStatusActionDelete()">
											<div class="flex items-center gap-2">
												<UIcon
													:name="isDeletingProject ? 'i-lucide-loader-circle' : 'i-lucide-trash-2'"
													class="size-4 shrink-0"
													:class="isDeletingProject ? 'animate-spin text-rose-500' : 'text-rose-500'" />
												<span class="text-sm">删除项目</span>
											</div>
										</div>
										<p
											v-if="!statusActionAvailable"
											class="rounded-lg bg-elevated/60 px-3 py-2 text-xs text-muted">
											当前状态暂无可执行操作
										</p>
									</div>
								</template>
							</UPopover>

							<UPopover
								v-model:open="spacePopoverOpen"
								:mode="'click'"
								:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
								:ui="drawerPopoverUi">
								<button
									v-motion="optionCardHoverMotion"
									type="button"
									class="w-full rounded-2xl border p-4 text-left transition-colors"
									:class="
										isStructureLocked
											? `${spaceCardClass} cursor-not-allowed opacity-70`
											: `${spaceCardClass} cursor-pointer`
									"
									:disabled="isStructureLocked">
									<div class="flex items-center gap-2.5">
										<UIcon
											:name="spaceCardIcon"
											class="size-4 shrink-0"
											:class="spaceCardLabelClass" />
										<div class="min-w-0 flex-1">
											<div
												class="mb-1 text-[11px]"
												:class="spaceCardLabelClass">
												所属 Space
											</div>
											<div
												class="truncate text-xs font-semibold"
												:class="spaceCardValueClass">
												{{ currentSpaceLabel }}
											</div>
										</div>
									</div>
								</button>
								<template #content>
									<div class="min-w-[180px] p-2">
										<p
											v-if="hasChildProjects"
											class="rounded-lg border border-default/70 bg-elevated/60 px-3 py-2 text-xs text-muted">
											当前项目存在子项目，暂不支持切换所属 Space。
										</p>
										<template v-else>
											<div
												v-for="space in spaceOptions"
												:key="space.value"
												class="cursor-pointer rounded-lg px-3 py-2 transition-colors hover:bg-elevated"
												:class="{ 'bg-elevated': spaceIdLocal === space.value }"
												@click="onSpaceSelect(space.value)">
												<div class="flex items-center gap-2">
													<UIcon
														:name="space.icon"
														class="size-4 shrink-0"
														:class="space.iconClass" />
													<span class="text-sm font-medium">{{ space.label }}</span>
												</div>
											</div>
										</template>
									</div>
								</template>
							</UPopover>

							<UPopover
								v-model:open="parentPopoverOpen"
								:mode="'click'"
								:popper="{ strategy: 'fixed', placement: 'bottom-end' }"
								:ui="drawerPopoverUi">
								<button
									v-motion="optionCardHoverMotion"
									type="button"
									class="w-full rounded-2xl border p-4 text-left transition-colors"
									:class="
										isStructureLocked
											? 'cursor-not-allowed bg-elevated/30 border-default/50 opacity-70'
											: 'cursor-pointer bg-elevated/50 border-default/60 hover:bg-elevated/80'
									"
									:disabled="isStructureLocked">
									<div class="flex items-center gap-2.5">
										<UIcon
											name="i-lucide-folder-tree"
											class="size-4 shrink-0 text-muted" />
										<div class="min-w-0 flex-1">
											<div class="mb-1 text-[11px] text-muted">所属 Project</div>
											<div class="truncate text-xs font-semibold text-default">
												{{ currentParentLabel }}
											</div>
										</div>
									</div>
								</button>
								<template #content>
									<div class="max-h-[300px] min-w-[220px] overflow-y-auto p-2">
										<div
											v-for="option in parentOptions"
											:key="option.value ?? 'root'"
											class="cursor-pointer rounded-lg px-3 py-2 transition-colors hover:bg-elevated"
											:class="{ 'bg-elevated': parentIdLocal === option.value }"
											:style="{ paddingLeft: `${12 + option.depth * 12}px` }"
											@click="onParentSelect(option.value)">
											<div class="flex items-center gap-2">
												<UIcon
													:name="PROJECT_ICON"
													class="size-4 shrink-0"
													:class="getParentOptionIconClass(option.value, option.depth)" />
												<span class="truncate text-sm">{{ option.label }}</span>
											</div>
										</div>
									</div>
								</template>
							</UPopover>
						</div>
					</section>

					<section class="space-y-2">
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">Tags</label>
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
						<input
							v-model="tagInput"
							type="text"
							placeholder="+ New Tag"
							class="h-8 w-[120px] bg-transparent border-none px-2 text-xs font-medium placeholder:text-muted/60 focus:outline-none focus:ring-0"
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
								新增
							</UButton>
						</div>

						<div
							v-for="(link, index) in linksLocal"
							:key="link.id ?? `draft-${index}`"
							class="space-y-2 rounded-xl border border-default p-3 bg-default">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 space-y-1">
									<p class="truncate text-sm font-semibold text-default">
										{{ link.title || '未命名链接' }}
									</p>
									<UBadge
										size="xs"
										color="neutral"
										variant="soft">
										{{ getLinkKindLabel(link.kind) }}
									</UBadge>
								</div>
								<div class="flex items-center gap-1">
									<UPopover :ui="{ content: 'w-[280px] rounded-xl p-3 space-y-2' }">
										<UButton
											color="neutral"
											variant="ghost"
											size="xs"
											icon="i-lucide-pencil-line" />
										<template #content>
											<UInput
												v-model="link.title"
												placeholder="标题（可选）"
												size="xs"
												:ui="{ rounded: 'rounded-lg' }"
												@focus="onLinkFieldFocus"
												@blur="onLinkFieldBlur"
												@input="clearLinkValidationError(index)"
												@compositionstart="onLinkCompositionStart"
												@compositionend="onLinkCompositionEnd" />
											<USelectMenu
												v-model="link.kind"
												:items="linkKindOptions"
												value-key="value"
												label-key="label"
												size="xs"
												:search-input="false"
												:ui="{ rounded: 'rounded-lg' }" />
											<UInput
												v-model="link.url"
												placeholder="URL（必填）"
												size="xs"
												:ui="{ rounded: 'rounded-lg' }"
												@focus="onLinkFieldFocus"
												@blur="onLinkFieldBlur"
												@input="clearLinkValidationError(index)"
												@compositionstart="onLinkCompositionStart"
												@compositionend="onLinkCompositionEnd" />
										</template>
									</UPopover>
									<UButton
										color="neutral"
										variant="ghost"
										size="xs"
										icon="i-lucide-trash-2"
										@click="removeLink(index)" />
								</div>
							</div>
							<a
								class="block truncate text-xs text-primary hover:underline"
								:href="link.url"
								target="_blank"
								rel="noreferrer">
								{{ link.url }}
							</a>
							<p
								v-if="linkValidationErrorIndex === index"
								class="text-[11px] text-error">
								URL 不能为空
							</p>
						</div>

						<div
							v-if="linkDraftVisible"
							class="space-y-2 rounded-xl border border-dashed border-default p-3">
							<div class="grid grid-cols-[1fr_120px_auto_auto] gap-2">
								<UInput
									v-model="linkDraftTitle"
									placeholder="标题（可选）"
									size="xs"
									:ui="{ rounded: 'rounded-lg' }"
									@focus="onLinkFieldFocus"
									@blur="onLinkFieldBlur"
									@compositionstart="onLinkCompositionStart"
									@compositionend="onLinkCompositionEnd" />
								<USelectMenu
									v-model="linkDraftKind"
									:items="linkKindOptions"
									value-key="value"
									label-key="label"
									size="xs"
									:search-input="false"
									:ui="{ rounded: 'rounded-lg' }" />
								<UButton
									color="primary"
									size="xs"
									@click="confirmLinkDraft">
									确认
								</UButton>
								<UButton
									color="neutral"
									variant="soft"
									size="xs"
									@click="cancelLinkDraft">
									取消
								</UButton>
							</div>
							<UInput
								v-model="linkDraftUrl"
								placeholder="URL（必填）"
								size="xs"
								:ui="{ rounded: 'rounded-lg' }"
								@focus="onLinkFieldFocus"
								@blur="onLinkFieldBlur"
								@compositionstart="onLinkCompositionStart"
								@compositionend="onLinkCompositionEnd" />
						</div>
						<p
							v-if="linksLocal.length === 0 && !linkDraftVisible"
							class="rounded-xl border border-default/70 bg-elevated/50 px-3 py-2 text-xs text-muted">
							暂无关联链接，点击右上角“新增”创建。
						</p>
					</section>

					<section class="space-y-2">
						<label class="text-xs font-semibold text-muted">备注</label>
						<UTextarea
							v-model="noteLocal"
							:rows="4"
							placeholder="为项目补充更多上下文信息..."
							class="w-full"
							:ui="{ rounded: 'rounded-xl' }"
							@focus="onNoteFocus"
							@blur="onNoteBlur"
							@compositionstart="onNoteCompositionStart"
							@compositionend="onNoteCompositionEnd" />
					</section>

					<section class="space-y-2">
						<div class="flex items-center justify-between">
							<label class="text-xs font-semibold text-muted">操作日志</label>
							<UBadge
								size="xs"
								color="neutral"
								variant="soft">
								{{ timelineLogs.length }}
							</UBadge>
						</div>

						<div
							v-if="timelineLoading"
							class="rounded-xl border border-default/70 bg-elevated/60 px-3 py-2 text-xs text-muted">
							日志加载中...
						</div>

						<div
							v-else-if="timelineErrorMessage"
							class="rounded-xl border border-red-200/70 bg-red-50/50 px-3 py-2.5 space-y-2">
							<div class="text-xs text-red-600">日志加载失败：{{ timelineErrorMessage }}</div>
							<UButton
								color="neutral"
								variant="soft"
								size="xs"
								icon="i-lucide-refresh-cw"
								@click="reloadTimeline">
								重试
							</UButton>
						</div>

						<div
							v-else-if="timelineEmpty"
							class="rounded-xl border border-default/70 bg-elevated/60 px-3 py-2 text-xs text-muted">
							暂无操作日志
						</div>

						<UTimeline
							v-else
							:items="timelineItems"
							size="sm" />
					</section>
				</div>

				<footer class="flex items-center justify-between border-t border-default px-6 py-3">
					<div class="text-[11px] text-muted">创建于 {{ createdAtLabel }}</div>
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

	<UModal
		v-model:open="confirmArchiveOpen"
		title="确认归档"
		description="确认归档当前项目">
		<template #body>
			<p class="text-sm text-muted">归档后项目状态会变为“已归档”，仍可在抽屉中取消归档。</p>
		</template>
		<template #footer>
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				@click="confirmArchiveOpen = false">
				取消
			</UButton>
			<UButton
				color="warning"
				size="sm"
				:loading="isArchivingProject"
				@click="onConfirmArchiveProject">
				确认归档
			</UButton>
		</template>
	</UModal>

	<UModal
		v-model:open="confirmDeleteOpen"
		title="确认删除"
		description="确认删除当前项目">
		<template #body>
			<p class="text-sm text-muted">删除后项目会进入回收站，可在回收站或抽屉内恢复。</p>
		</template>
		<template #footer>
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				@click="confirmDeleteOpen = false">
				取消
			</UButton>
			<UButton
				color="error"
				size="sm"
				:loading="isDeletingProject"
				@click="onConfirmDeleteProject">
				确认删除
			</UButton>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import { computed, ref } from 'vue'
	import { storeToRefs } from 'pinia'

	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import {
		PROJECT_ICON,
		PROJECT_LEVEL_TEXT_CLASSES,
		PROJECT_ROOT_ICON_CLASS,
		PROJECT_STATUS_DISPLAY,
		type ProjectComputedStatusValue,
		type ProjectPriorityValue,
	} from '@/config/project'
	import { DEFAULT_SPACE_DISPLAY, SPACE_DISPLAY } from '@/config/space'
	import { TASK_PRIORITY_STYLES } from '@/config/task'
	import { createDrawerLayerUi, createDrawerPopoverLayerUi } from '@/config/ui-layer'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
	import { useProjectInspectorActivityLogs } from './composables/useProjectInspectorActivityLogs'
	import { useProjectInspectorDrawer } from './composables/useProjectInspectorDrawer'

	const {
		currentProject,
		isOpen,
		titleLocal,
		noteLocal,
		priorityLocal,
		spaceIdLocal,
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
		spaceOptions,
		parentOptions,
		linkKindOptions,
		rootLabel,
		isStructureLocked,
		isSaveStateVisible,
		canRetrySave,
		canDeleteProject,
		canArchiveProject,
		hasChildProjects,
		isLifecycleBusy,
		isDeletingProject,
		isArchivingProject,
		saveState,
		addTag,
		removeTag,
		addLinkDraft,
		cancelLinkDraft,
		confirmLinkDraft,
		removeLink,
		clearLinkValidationError,
		onTitleFocus,
		onTitleBlur,
		onTitleCompositionStart,
		onTitleCompositionEnd,
		onNoteFocus,
		onNoteBlur,
		onNoteCompositionStart,
		onNoteCompositionEnd,
		onLinkFieldFocus,
		onLinkFieldBlur,
		onLinkCompositionStart,
		onLinkCompositionEnd,
		onSpaceChange,
		onRetrySave,
		deleteCurrentProject,
		archiveCurrentProject,
	} = useProjectInspectorDrawer()
	const refreshSignals = useRefreshSignalsStore()
	const { projectTick } = storeToRefs(refreshSignals)
	const { timelineLogs, timelineLoading, timelineErrorMessage, timelineEmpty, reloadTimeline } =
		useProjectInspectorActivityLogs({
			currentProject,
			projectTick,
		})

	const drawerUi = createDrawerLayerUi({
		content:
			'w-[460px] max-w-[calc(100vw-1.5rem)] h-[calc(100%-1.5rem)] my-3 mr-3 flex flex-col rounded-3xl border border-default bg-default/92 backdrop-blur-2xl shadow-2xl overflow-hidden',
	})
	const drawerPopoverUi = createDrawerPopoverLayerUi()
	const optionCardHoverMotion = useCardHoverMotionPreset()
	const priorityPopoverOpen = ref(false)
	const statusPopoverOpen = ref(false)
	const spacePopoverOpen = ref(false)
	const parentPopoverOpen = ref(false)

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

	const saveStateDotClass = computed(() => {
		if (saveState.value === 'saving') return 'bg-blue-600'
		if (saveState.value === 'saved') return 'bg-emerald-600'
		if (saveState.value === 'error') return 'bg-rose-600'
		return 'bg-neutral-500'
	})

	const priorityOption = computed(() => {
		return priorityOptions.find((item) => item.value === priorityLocal.value) ?? priorityOptions[0]
	})

	const priorityLabel = computed(() => priorityOption.value?.label ?? '未设定')
	const priorityIcon = computed(() => priorityOption.value?.icon ?? 'i-lucide-alert-triangle')

	const priorityStyle = computed(() => {
		const key = priorityLocal.value as keyof typeof TASK_PRIORITY_STYLES
		return TASK_PRIORITY_STYLES[key] ?? TASK_PRIORITY_STYLES.default
	})

	const priorityCardClass = computed(() => priorityStyle.value.cardClass)
	const priorityIconClass = computed(() => priorityStyle.value.iconClass)
	const priorityTextClass = computed(() => priorityStyle.value.textClass)

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

	const statusDisplay = computed(() => {
		const status = (currentProject.value?.computedStatus ?? 'inProgress') as ProjectComputedStatusValue
		return PROJECT_STATUS_DISPLAY[status] ?? PROJECT_STATUS_DISPLAY.inProgress
	})

	const statusLabel = computed(() => statusDisplay.value.label)
	const statusDotClass = computed(() => statusDisplay.value.dot)
	const statusBadgeColor = computed(() => statusDisplay.value.color)

	const statusCardClass = computed(() => {
		const status = currentProject.value?.computedStatus ?? 'inProgress'
		switch (status) {
			case 'done':
				return 'bg-emerald-50/40 border-emerald-200'
			case 'archived':
				return 'bg-slate-50/70 border-slate-200'
			case 'deleted':
				return 'bg-rose-50/40 border-rose-200'
			default:
				return 'bg-amber-50/40 border-amber-200'
		}
	})

	const statusIconName = computed(() => {
		const status = currentProject.value?.computedStatus ?? 'inProgress'
		switch (status) {
			case 'done':
				return 'i-lucide-check-circle-2'
			case 'archived':
				return 'i-lucide-archive'
			case 'deleted':
				return 'i-lucide-trash-2'
			default:
				return 'i-lucide-loader-circle'
		}
	})

	const statusIconClass = computed(() => {
		const status = currentProject.value?.computedStatus ?? 'inProgress'
		switch (status) {
			case 'done':
				return 'text-emerald-500'
			case 'archived':
				return 'text-slate-500'
			case 'deleted':
				return 'text-rose-500'
			default:
				return 'text-amber-500'
		}
	})

	const statusTextClass = computed(() => {
		const status = currentProject.value?.computedStatus ?? 'inProgress'
		switch (status) {
			case 'done':
				return 'text-emerald-600'
			case 'archived':
				return 'text-slate-600'
			case 'deleted':
				return 'text-rose-600'
			default:
				return 'text-amber-600'
		}
	})

	const statusActionAvailable = computed(() => canArchiveProject.value || canDeleteProject.value)

	const spaceDisplay = computed(() => {
		const sid = spaceIdLocal.value as keyof typeof SPACE_DISPLAY | undefined
		if (!sid) return DEFAULT_SPACE_DISPLAY
		return SPACE_DISPLAY[sid] ?? DEFAULT_SPACE_DISPLAY
	})

	const currentSpaceLabel = computed(() => spaceDisplay.value.label)
	const spaceCardIcon = computed(() => spaceDisplay.value.icon)
	const spaceCardClass = computed(() => spaceDisplay.value.cardClass)
	const spaceCardLabelClass = computed(() => spaceDisplay.value.cardLabelClass)
	const spaceCardValueClass = computed(() => spaceDisplay.value.cardValueClass)

	const currentParentLabel = computed(() => {
		const option = parentOptions.value.find((item) => item.value === parentIdLocal.value)
		return option?.label ?? rootLabel
	})

	const lastUpdatedLabel = computed(() => {
		const timestamp = currentProject.value?.lastTaskUpdatedAt ?? currentProject.value?.updatedAt ?? null
		if (!timestamp) return '暂无'
		const date = new Date(timestamp)
		if (Number.isNaN(date.getTime())) return '暂无'
		const yyyy = date.getFullYear()
		const mm = String(date.getMonth() + 1).padStart(2, '0')
		const dd = String(date.getDate()).padStart(2, '0')
		const hh = String(date.getHours()).padStart(2, '0')
		const min = String(date.getMinutes()).padStart(2, '0')
		return `${yyyy}.${mm}.${dd} ${hh}:${min}`
	})

	const shortcutHint = computed(() => '快捷键：Ctrl/⌘ + S 保存，Esc 关闭')
	const confirmDeleteOpen = ref(false)
	const confirmArchiveOpen = ref(false)

	const PROJECT_ACTION_ICON_MAP: Record<string, string> = {
		project_created: 'i-lucide-circle-plus',
		project_deleted: 'i-lucide-trash-2',
		project_restored: 'i-lucide-undo-2',
		project_field_updated: 'i-lucide-pencil-line',
		project_archived: 'i-lucide-archive',
		project_unarchived: 'i-lucide-folder-open',
	}

	const timelineItems = computed(() => {
		return timelineLogs.value.map((item) => ({
			title: item.actionLabel,
			description: item.detail || '无详情',
			date: formatDateTime(item.createdAt),
			icon: PROJECT_ACTION_ICON_MAP[item.action] ?? 'i-lucide-history',
		}))
	})

	function formatDateTime(ts: number): string {
		const date = new Date(ts)
		if (Number.isNaN(date.getTime())) return '时间未知'
		const yyyy = date.getFullYear()
		const mm = String(date.getMonth() + 1).padStart(2, '0')
		const dd = String(date.getDate()).padStart(2, '0')
		const hh = String(date.getHours()).padStart(2, '0')
		const min = String(date.getMinutes()).padStart(2, '0')
		return `${yyyy}.${mm}.${dd} ${hh}:${min}`
	}

	function getLinkKindLabel(kind: string): string {
		return linkKindOptions.find((option) => option.value === kind)?.label ?? '其他'
	}

	function onPrioritySelect(value: ProjectPriorityValue) {
		priorityLocal.value = value
		priorityPopoverOpen.value = false
	}

	async function onSpaceSelect(value: string) {
		if (isStructureLocked.value || hasChildProjects.value) return
		await onSpaceChange(value)
		spacePopoverOpen.value = false
	}

	function onParentSelect(value: string | null) {
		if (isStructureLocked.value) return
		parentIdLocal.value = value
		parentPopoverOpen.value = false
	}

	function onStatusActionArchive() {
		onRequestArchiveProject()
		statusPopoverOpen.value = false
	}

	function onStatusActionDelete() {
		onRequestDeleteProject()
		statusPopoverOpen.value = false
	}

	function getParentOptionIconClass(value: string | null, depth: number): string {
		if (value === null) return PROJECT_ROOT_ICON_CLASS
		return PROJECT_LEVEL_TEXT_CLASSES[Math.min(depth, PROJECT_LEVEL_TEXT_CLASSES.length - 1)]
	}

	function onRequestDeleteProject() {
		if (isLifecycleBusy.value) return
		confirmDeleteOpen.value = true
	}

	async function onConfirmDeleteProject() {
		const ok = await deleteCurrentProject()
		if (ok) {
			confirmDeleteOpen.value = false
		}
	}

	function onRequestArchiveProject() {
		if (isLifecycleBusy.value) return
		confirmArchiveOpen.value = true
	}

	async function onConfirmArchiveProject() {
		const ok = await archiveCurrentProject()
		if (ok) {
			confirmArchiveOpen.value = false
		}
	}

</script>
