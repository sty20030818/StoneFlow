<template>
	<div
		class="relative rounded-2xl border bg-white p-4 transition-[color,background-color,border-color,box-shadow,opacity] duration-300 ease-out hover:-translate-y-px hover:shadow-md group flex gap-4 items-start cursor-default"
		:class="[
			cardBorderClass,
			isEditMode && selected ? 'bg-red-50/50' : 'bg-white',
			isEditMode && !selected ? 'opacity-80' : '',
		]"
		@click="onCardClick">
		<!-- 编辑模式：选中遮罩 -->
		<div
			v-if="isEditMode && selected"
			class="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-2 ring-red-500/20 bg-red-500/5"></div>

		<!-- 左侧操作区 (复选框 / 选择) -->
		<div class="mt-0.5 shrink-0">
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

			<!-- 普通模式完成复选框 -->
			<button
				v-else
				@click.stop="onComplete"
				class="size-5 rounded-full border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center cursor-pointer">
				<!-- 删除内部蓝色实心圆 (根据需求) -->
			</button>
		</div>

		<!-- 内容区域 -->
		<div class="grow min-w-0 flex flex-col gap-1.5">
			<!--第一行：标题 | 优先级 | 截止日期 -->
			<div class="flex items-center justify-between gap-4">
				<div class="flex items-center gap-2 min-w-0">
					<SpaceLabel
						v-if="showSpaceLabel"
						:space-id="task.spaceId"
						size="xs" />

					<h3
						class="font-bold text-slate-800 text-base truncate leading-tight"
						:class="{ 'text-slate-400': isEditMode && !selected }">
						{{ task.title }}
					</h3>

					<!-- 优先级徽章 -->
					<!-- 使用显式类名确保颜色在所有环境下均可渲染 -->
					<UBadge
						v-if="priorityConfig"
						variant="soft"
						size="xs"
						class="font-mono px-1.5 py-0.5 rounded h-5"
						:class="priorityConfig.badgeClass">
						{{ task.priority }}
					</UBadge>
				</div>

				<!-- 右侧：时间 & 操作 -->
				<div class="shrink-0 flex items-center gap-2">
					<!-- 时间显示：Deadline (Pill) + CreatedAt (Text) -->
					<div class="flex items-center gap-2 text-[10px]">
						<!-- 截止日期：使用相对时间描述 (今天/明天/x天后) -->
						<span
							v-if="task.deadlineAt"
							class="px-1.5 py-0.5 rounded font-bold transition-colors"
							:class="isOverdue(task.deadlineAt) ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'">
							{{ formatRelativeTime(task.deadlineAt) }}
						</span>

						<!-- 创建时间：使用绝对时间 (HH:mm / MM-DD) -->
						<span class="text-slate-400 font-medium">
							{{ formatAbsoluteTime(task.createdAt) }}
						</span>
					</div>

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

			<!-- 第二行：备注 | 标签 | 链接 -->
			<div class="flex items-center justify-between gap-4 min-h-[20px]">
				<p class="text-xs text-slate-400 truncate grow pr-4 font-medium">
					{{ task.note || '无备注' }}
				</p>

				<div class="flex items-center gap-2 shrink-0">
					<!-- 链接数量 -->
					<div
						v-if="(task.links?.length ?? 0) > 0"
						class="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
						<UIcon
							name="i-lucide-link-2"
							class="size-3" />
						<span class="font-medium">{{ task.links.length }}</span>
					</div>

					<!-- 标签 -->
					<div class="flex gap-1.5">
						<span
							v-for="tag in task.tags"
							:key="tag"
							class="text-[9px] font-bold text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100/30">
							#{{ tag }}
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import SpaceLabel from '@/components/SpaceLabel.vue'
	import { TASK_PRIORITY_STYLES } from '@/config/task'
	import type { TaskDto } from '@/services/api/tasks'
	import { computed } from 'vue'

	const props = defineProps<{
		task: TaskDto
		showSpaceLabel?: boolean
		isEditMode?: boolean
		selected?: boolean
		selectRingClass: string
		onToggleSelect: () => void
		onCardClick: () => void
		onRequestDelete: () => void
		onComplete: () => void
		formatRelativeTime: (timestamp: number) => string
		formatAbsoluteTime: (timestamp: number) => string
	}>()

	// 优先级配置
	const priorityConfig = computed(() => {
		return TASK_PRIORITY_STYLES[props.task.priority] || TASK_PRIORITY_STYLES.default
	})

	const cardBorderClass = computed(() => {
		if (props.isEditMode && props.selected) return 'border-red-200'
		const base = 'border-slate-200'

		if (!priorityConfig.value) return base + ' hover:border-slate-300'

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
</script>
