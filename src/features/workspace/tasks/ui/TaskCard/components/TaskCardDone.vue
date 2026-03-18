<template>
	<!-- 外层容器 -->
	<div
		class="relative rounded-2xl flex items-center"
		@mouseenter="onWrapperMouseEnter"
		@mouseleave="onWrapperMouseLeave">
		<!-- 主卡片容器 -->
		<!-- 临时隐藏任务右键菜单（保留逻辑便于后续恢复） -->
		<div
			:key="isEditModeActive ? 'edit-card' : 'normal-card'"
			v-motion="resolvedCardMotionPreset"
			class="relative flex w-full cursor-default items-center gap-4 rounded-2xl border border-transparent bg-elevated/55 p-4 opacity-60 select-none transition-[color,background-color,border-color,box-shadow,opacity,margin] duration-300"
			:class="[
				isEditModeActive && selected
					? 'border-red-200 bg-red-50/50 opacity-100 shadow-sm dark:border-red-500/25 dark:bg-red-500/12'
					: '',
				isEditModeActive && !selected ? 'opacity-40' : '',
				isEditModeActive ? 'task-card-edit-static' : '',
				!isEditModeActive ? 'hover:border-slate-200 hover:opacity-100 dark:hover:border-neutral-700' : '',
				editActionVisible ? 'mr-14' : '',
			]"
			@click="onCardClick">
			<!-- 编辑模式：选中遮罩 -->
			<div
				v-if="isEditModeActive && selected"
				class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-red-500/5 ring-2 ring-red-500/20 dark:bg-red-500/8 dark:ring-red-400/25"></div>

			<!-- 左侧操作区 -->
			<div class="shrink-0 flex items-center">
				<!-- 编辑模式选择圆圈 -->
				<button
					v-if="isEditModeActive"
					type="button"
					class="no-drag flex size-5 cursor-pointer items-center justify-center rounded-full border-2 transition-colors"
					:class="[selectRingClass, selected ? 'border-red-500 bg-red-50 dark:bg-red-500/16' : '']"
					@click.stop="onToggleSelect">
					<UIcon
						v-if="selected"
						name="i-lucide-check"
						class="size-3 text-red-500 dark:text-red-200" />
				</button>

				<!-- 完成状态图标 -->
				<div
					v-else
					class="size-5 flex items-center justify-center rounded-full"
					:class="doneReasonStyle.ringClass">
					<UIcon
						:name="doneReasonStyle.icon"
						class="size-3" />
				</div>
			</div>

			<!-- 内容区域 (单行) -->
			<div class="grow min-w-0 flex items-center justify-between gap-4">
				<!-- 左侧：标题 | 状态徽章 -->
				<div class="flex items-center gap-2 min-w-0">
					<span class="truncate font-medium text-muted line-through">
						{{ task.title }}
					</span>

					<UBadge
						v-if="isCancelled"
						size="xs"
						color="neutral"
						variant="soft"
						class="px-1.5 py-0 rounded text-[10px]">
						{{ doneReasonStyle.badgeLabel }}
					</UBadge>
				</div>

				<!-- 右侧：时间 -->
				<div class="shrink-0 flex items-center gap-2">
					<!-- 完成时间 (使用绝对时间，便于复盘) -->
					<span
						v-if="showTime && task.completedAt"
						class="text-[10px] font-medium text-muted">
						{{ formatAbsoluteTime(task.completedAt) }}
					</span>
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
	import { computed, ref, watch } from 'vue'

	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import type { WorkspaceTask } from '../../../../shared/model'

	const props = defineProps<{
		task: WorkspaceTask
		isEditMode?: boolean
		selected?: boolean
		isCancelled: boolean
		showTime?: boolean
		doneReasonStyle: {
			ringClass: string
			icon: string
			badgeLabel: string
		}
		selectRingClass: string
		onToggleSelect: () => void
		onCardClick: () => void
		onRequestDelete: () => void
		onRequestEdit: () => void
		onContextMenu: (event: MouseEvent) => void
		formatAbsoluteTime: (timestamp: number) => string
	}>()
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
