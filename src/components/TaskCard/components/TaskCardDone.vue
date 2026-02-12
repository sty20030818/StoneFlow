<template>
	<!-- 外层容器 -->
	<div
		class="relative group rounded-2xl flex items-center">
		<!-- 主卡片容器 -->
		<div
			v-motion="cardHoverMotionPreset"
			class="relative w-full flex gap-4 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-[color,background-color,border-color,box-shadow,opacity,margin] duration-300 opacity-60 hover:opacity-100 cursor-default items-center select-none"
			:class="[
				isEditMode && selected ? 'border-red-200 bg-red-50/50 opacity-100 shadow-sm' : '',
				isEditMode && !selected ? 'opacity-40' : '',
				isEditMode ? 'group-hover:mr-14' : '',
			]"
			@click="onCardClick"
			@contextmenu.prevent.stop="onContextMenu">
			<!-- 编辑模式：选中遮罩 -->
			<div
				v-if="isEditMode && selected"
				class="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-2 ring-red-500/20 bg-red-500/5"></div>

			<!-- 左侧操作区 -->
			<div class="shrink-0 flex items-center">
				<!-- 编辑模式选择圆圈 -->
				<button
					v-if="isEditMode"
					type="button"
					class="no-drag size-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
					:class="[selectRingClass, selected ? 'border-red-500 bg-red-50' : '']"
					@click.stop="onToggleSelect">
					<UIcon
						v-if="selected"
						name="i-lucide-check"
						class="size-3 text-white" />
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
					<span class="text-slate-500 font-medium line-through truncate">
						{{ task.title }}
					</span>

					<UBadge
						v-if="isCancelled"
						size="xs"
						color="gray"
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
						class="text-[10px] font-medium text-slate-400">
						{{ formatAbsoluteTime(task.completedAt) }}
					</span>
				</div>
			</div>
		</div>

		<!-- 右侧删除按钮 (独立于卡片，绝对定位在右侧) -->
		<button
			v-if="isEditMode"
			type="button"
			class="no-drag absolute right-1 size-10 rounded-full bg-red-100 text-red-500 flex items-center justify-center transition-all duration-300 ease-out opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white shadow-sm hover:shadow-md hover:scale-105 z-0"
			@click.stop="onRequestDelete">
			<UIcon
				name="i-lucide-trash-2"
				class="size-5" />
		</button>
	</div>
</template>

<script setup lang="ts">
	import type { MotionVariants } from '@vueuse/motion'
	import { computed } from 'vue'

	import { useMotionPreset } from '@/composables/base/motion'
	import type { TaskDto } from '@/services/api/tasks'

	const props = defineProps<{
		task: TaskDto
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
	const cardMotionPreset = useMotionPreset('card')
	const cardHoverMotionPreset = computed<MotionVariants<string>>(() => ({
		initial: {
			y: 0,
			scale: 1,
		},
		enter: {
			y: 0,
			scale: 1,
			transition: cardMotionPreset.value.hovered?.transition,
		},
		hovered: cardMotionPreset.value.hovered,
	}))
</script>
