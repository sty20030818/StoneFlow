<template>
	<div
		class="relative flex gap-4 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-[color,background-color,border-color,box-shadow,opacity] duration-300 opacity-60 hover:opacity-100 cursor-default items-center"
		:class="[
			isEditMode && selected ? 'border-red-200 bg-red-50/50 opacity-100 shadow-sm' : '',
			isEditMode && !selected ? 'opacity-40' : '',
		]"
		@click="onCardClick">
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
				class="size-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
				:class="selectRingClass"
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

			<!-- 右侧：时间 & 操作 -->
			<div class="shrink-0 flex items-center gap-2">
				<!-- 完成时间 (使用绝对时间，便于复盘) -->
				<span
					v-if="showTime && task.completedAt"
					class="text-[10px] font-medium text-slate-400">
					{{ formatAbsoluteTime(task.completedAt) }}
				</span>

				<button
					v-if="isEditMode"
					type="button"
					class="text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors"
					@click.stop="onRequestDelete">
					<UIcon
						name="i-lucide-trash-2"
						class="size-4" />
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { TaskDto } from '@/services/api/tasks'

	defineProps<{
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
		formatAbsoluteTime: (timestamp: number) => string
	}>()
</script>
