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
						<label class="text-xs font-semibold text-muted">项目标题</label>
						<UInput
							v-model="titleLocal"
							:disabled="isStructureLocked"
							placeholder="请输入项目标题"
							size="lg"
							class="w-full"
							:ui="{ rounded: 'rounded-xl' }"
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
							<label class="text-xs font-semibold text-muted">生命周期</label>
							<span
								v-if="isLifecycleBusy"
								class="text-[11px] text-muted">
								处理中...
							</span>
						</div>
						<div class="flex flex-wrap gap-2">
							<UButton
								v-if="canRestoreProject"
								color="success"
								variant="soft"
								size="xs"
								icon="i-lucide-undo-2"
								:loading="isRestoringProject"
								:disabled="isLifecycleBusy"
								@click="onRestoreProject">
								恢复项目
							</UButton>
							<UButton
								v-if="canArchiveProject"
								color="warning"
								variant="soft"
								size="xs"
								icon="i-lucide-archive"
								:loading="isArchivingProject"
								:disabled="isLifecycleBusy"
								@click="onRequestArchiveProject">
								归档项目
							</UButton>
							<UButton
								v-if="canUnarchiveProject"
								color="neutral"
								variant="soft"
								size="xs"
								icon="i-lucide-folder-open"
								:loading="isUnarchivingProject"
								:disabled="isLifecycleBusy"
								@click="onUnarchiveProject">
								取消归档
							</UButton>
							<UButton
								v-if="canDeleteProject"
								color="error"
								variant="soft"
								size="xs"
								icon="i-lucide-trash-2"
								:loading="isDeletingProject"
								:disabled="isLifecycleBusy"
								@click="onRequestDeleteProject">
								删除项目
							</UButton>
						</div>
						<p
							v-if="canRestoreProject"
							class="text-[11px] text-muted">
							已删除项目可在此恢复，恢复仅影响当前项目，不会递归恢复后代。
						</p>
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

	import { PROJECT_STATUS_DISPLAY, type ProjectComputedStatusValue } from '@/config/project'
	import { createDrawerLayerUi } from '@/config/ui-layer'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
	import { useProjectInspectorActivityLogs } from './composables/useProjectInspectorActivityLogs'
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
		canDeleteProject,
		canRestoreProject,
		canArchiveProject,
		canUnarchiveProject,
		isLifecycleBusy,
		isDeletingProject,
		isRestoringProject,
		isArchivingProject,
		isUnarchivingProject,
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
		onRetrySave,
		deleteCurrentProject,
		restoreCurrentProject,
		archiveCurrentProject,
		unarchiveCurrentProject,
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

	async function onRestoreProject() {
		if (isLifecycleBusy.value) return
		await restoreCurrentProject()
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

	async function onUnarchiveProject() {
		if (isLifecycleBusy.value) return
		await unarchiveCurrentProject()
	}

	function isParentOption(item: unknown): item is { value: string | null; label: string; depth: number } {
		return !!item && typeof item === 'object' && 'label' in item && 'depth' in item
	}
</script>
