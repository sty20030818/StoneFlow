<template>
	<!-- 外层容器:相对定位,用于删除按钮的绝对定位基准 -->
	<div
		class="relative rounded-2xl flex items-center"
		@mouseenter="onWrapperMouseEnter"
		@mouseleave="onWrapperMouseLeave">
		<!-- 主卡片容器 -->
		<!-- 临时隐藏任务右键菜单（保留逻辑便于后续恢复） -->
		<div
			:key="isEditModeActive ? 'edit-card' : 'normal-card'"
			v-motion="resolvedCardMotionPreset"
			class="relative flex w-full cursor-default gap-4 overflow-hidden rounded-2xl border bg-default p-4 select-none transition-[color,background-color,border-color,box-shadow,opacity,margin] duration-300 ease-out"
			:class="[
				cardBorderClass,
				isEditModeActive && selected ? 'bg-red-50/50 dark:bg-red-500/12' : 'bg-default',
				isEditModeActive && !selected ? 'opacity-80' : '',
				isEditModeActive ? 'task-card-edit-static' : '',
				!isEditModeActive ? 'hover:shadow-md' : '',
				editActionVisible ? 'mr-14' : '',
			]"
			@click="onCardClick">
			<!-- 编辑模式：选中遮罩 -->
			<div
				v-if="isEditModeActive && selected"
				class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-red-500/5 ring-2 ring-red-500/20 dark:bg-red-500/8 dark:ring-red-400/25"></div>

			<!-- 左侧操作区:垂直布局 (圆圈 + 拖拽手柄) - 保持不动 -->
			<div class="shrink-0 flex flex-col items-center gap-1">
				<!-- 编辑模式选择圆圈 -->
				<button
					v-if="isEditModeActive"
					type="button"
					class="no-drag flex size-6 cursor-pointer items-center justify-center rounded-full border-2 transition-colors hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-500/12"
					:class="[selectRingClass, selected ? 'border-red-500 bg-red-50 dark:bg-red-500/16' : 'border-slate-300 dark:border-neutral-600']"
					@click.stop="onToggleSelect">
					<UIcon
						v-if="selected"
						name="i-lucide-check"
						class="size-3 text-red-500 dark:text-red-300" />
				</button>

				<!-- 普通模式完成复选框 -->
				<button
					v-else
					@click.stop="onComplete"
					class="no-drag flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-slate-300 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:border-neutral-600 dark:hover:bg-blue-500/12"></button>
			</div>

			<!-- 内容区域 -->
			<div class="grow min-w-0 flex flex-col gap-2.5">
				<!--第一行:标题 | 优先级 | 截止日期 -->
				<div class="flex items-start justify-between gap-4">
					<div class="flex items-start gap-2 min-w-0 flex-1">
						<!-- 优先级徽章（标题左侧，提升扫读效率） -->
						<UBadge
							v-if="priorityConfig"
							variant="soft"
							size="xs"
							class="shrink-0 font-bold px-1.5 py-0.5 rounded h-5 text-[11px]"
							:class="priorityConfig.badgeClass">
							{{ task.priority }}
						</UBadge>

						<SpaceLabel
							v-if="showSpaceLabel"
							:space-id="task.spaceId"
							size="xs" />

						<h3
							class="min-w-0 flex-1 font-bold text-default line-clamp-2 leading-tight"
							:class="{ 'text-muted': isEditModeActive && !selected }">
							{{ task.title }}
						</h3>
					</div>

					<!-- 右侧:时间 + 操作 -->
					<div class="shrink-0 flex items-center gap-2">
						<!-- 时间显示：Deadline (Pill) + CreatedAt (Text) -->
						<div class="flex items-center gap-2 text-[10px]">
							<!-- 截止日期：使用相对时间描述 (今天/明天/x天后) -->
							<span
								v-if="task.deadlineAt"
								class="px-1.5 py-0.5 rounded font-bold transition-colors"
								:class="
									isOverdue(task.deadlineAt)
										? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-200'
										: 'bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-300'
								">
								{{ formatRelativeTime(task.deadlineAt) }}
							</span>

							<!-- 创建时间：使用绝对时间 (HH:mm / MM-DD) -->
							<span class="font-medium text-muted">
								{{ formatAbsoluteTime(task.createdAt) }}
							</span>
						</div>
					</div>
				</div>

				<!-- 第二行:备注 | 元信息徽章 | 标签 -->
				<div class="flex items-center justify-between gap-4 min-h-[20px]">
					<p class="grow truncate pr-4 text-xs font-medium text-muted">
						{{ task.note || t('taskCard.noNote') }}
					</p>

					<div class="flex items-center gap-2 shrink-0">
						<TaskCardMetaBadges :task="task" />

						<!-- 标签 -->
						<div class="flex gap-1.5">
							<span
								v-for="tag in task.tags"
								:key="tag"
								class="rounded border border-blue-100/30 bg-blue-50/50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
								#{{ tag }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- 右侧删除按钮 (独立于卡片，绝对定位在右侧) -->
		<button
			v-if="isEditModeActive"
			type="button"
			class="no-drag absolute right-1 z-10 flex size-10 items-center justify-center rounded-full bg-red-100 text-red-500 shadow-sm transition-[opacity,background-color,color,box-shadow] duration-300 ease-out hover:bg-red-500 hover:text-white hover:shadow-md dark:bg-red-500/15 dark:text-red-200"
			:class="editActionVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
			@click.stop="onRequestDelete">
			<UIcon
				name="i-lucide-trash-2"
				class="size-5" />
		</button>
	</div>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { computed, ref, watch } from 'vue'

	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import SpaceLabel from '@/components/shared/SpaceLabel.vue'
	import { TASK_PRIORITY_STYLES } from '@/config/task'
	import TaskCardMetaBadges from './TaskCardMetaBadges.vue'
	import type { WorkspaceTask } from '../../../../shared/model'

	const props = defineProps<{
		task: WorkspaceTask
		showSpaceLabel?: boolean
		isEditMode?: boolean
		selected?: boolean
		selectRingClass: string
		onToggleSelect: () => void
		onCardClick: () => void
		onRequestDelete: () => void
		onRequestEdit: () => void
		onContextMenu: (event: MouseEvent) => void
		onComplete: () => void
		formatRelativeTime: (timestamp: number) => string
		formatAbsoluteTime: (timestamp: number) => string
	}>()
	const { t } = useI18n({ useScope: 'global' })
	const cardHoverMotionPreset = useCardHoverMotionPreset()
	const isEditModeActive = computed(() => props.isEditMode === true)
	const isEditHovering = ref(false)
	const resolvedCardMotionPreset = computed(() =>
		isEditModeActive.value
			? {
					initial: {
						y: 0,
						scale: 1,
					},
					enter: {
						y: 0,
						scale: 1,
						transition: cardHoverMotionPreset.value.enter?.transition,
					},
				}
			: cardHoverMotionPreset.value,
	)
	const editActionVisible = computed(() => Boolean(isEditModeActive.value && isEditHovering.value))

	// 优先级配置
	const priorityConfig = computed(() => {
		return TASK_PRIORITY_STYLES[props.task.priority] || TASK_PRIORITY_STYLES.default
	})

	const cardBorderClass = computed(() => {
		if (isEditModeActive.value && props.selected) return 'border-red-200 dark:border-red-500/25'
		const base = 'border-slate-200 dark:border-neutral-800'

		if (!priorityConfig.value) return base + ' hover:border-slate-300 dark:hover:border-neutral-700'

		return {
			[base]: true,
			[priorityConfig.value.cardBorderClass]: true,
			[priorityConfig.value.cardShadowClass]: true,
		}
	})

	const isOverdue = (timestamp: number) => {
		const now = Date.now()
		return timestamp < now
	}

	function onWrapperMouseEnter() {
		if (!isEditModeActive.value) return
		isEditHovering.value = true
	}

	function onWrapperMouseLeave() {
		isEditHovering.value = false
	}

	watch(isEditModeActive, (enabled) => {
		if (!enabled) isEditHovering.value = false
	})
</script>

<style scoped>
	/* 编辑态严格禁止 motion 对卡片做位移/缩放，只保留左移与删除按钮显隐。 */
	.task-card-edit-static {
		transform: none !important;
	}
</style>
