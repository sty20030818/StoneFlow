<template>
	<!-- 外层容器:相对定位,用于删除按钮的绝对定位基准 -->
	<div class="relative group rounded-2xl flex items-center">
		<!-- 主卡片容器 -->
		<div
			class="relative w-full rounded-2xl border bg-white p-4 transition-[color,background-color,border-color,box-shadow,opacity,transform,margin] duration-300 ease-out hover:-translate-y-px hover:shadow-md flex gap-4 items-start cursor-default overflow-hidden select-none"
			:class="[
				cardBorderClass,
				isEditMode && selected ? 'bg-red-50/50' : 'bg-white',
				isEditMode && !selected ? 'opacity-80' : '',
				isEditMode ? 'group-hover:mr-14' : '',
			]"
			@click="onCardClick"
			@contextmenu.prevent.stop="onContextMenu">
			<!-- 编辑模式：选中遮罩 -->
			<div
				v-if="isEditMode && selected"
				class="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-2 ring-red-500/20 bg-red-500/5"></div>

			<!-- 左侧操作区:垂直布局 (圆圈 + 拖拽手柄) - 保持不动 -->
			<div class="shrink-0 flex flex-col items-center gap-1">
				<!-- 编辑模式选择圆圈 -->
				<button
					v-if="isEditMode"
					type="button"
					class="no-drag size-6 rounded-full border-2 hover:border-red-500 hover:bg-red-50 transition-all flex items-center justify-center cursor-pointer"
					:class="[selectRingClass, selected ? 'border-red-500 bg-red-50' : 'border-slate-300']"
					@click.stop="onToggleSelect">
					<UIcon
						v-if="selected"
						name="i-lucide-check"
						class="size-3 text-red-500" />
				</button>

				<!-- 普通模式完成复选框 -->
				<button
					v-else
					@click.stop="onComplete"
					class="no-drag size-6 rounded-full border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center cursor-pointer"></button>
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
							class="shrink-0 font-bold px-1.5 py-0.5 rounded h-5"
							:class="priorityConfig.badgeClass">
							{{ task.priority }}
						</UBadge>

						<SpaceLabel
							v-if="showSpaceLabel"
							:space-id="task.spaceId"
							size="xs" />

						<h3
							class="min-w-0 flex-1 font-extrabold text-slate-800 text-base line-clamp-2 leading-tight"
							:class="{ 'text-slate-400': isEditMode && !selected }">
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
								:class="isOverdue(task.deadlineAt) ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'">
								{{ formatRelativeTime(task.deadlineAt) }}
							</span>

							<!-- 创建时间：使用绝对时间 (HH:mm / MM-DD) -->
							<span class="text-slate-400 font-medium">
								{{ formatAbsoluteTime(task.createdAt) }}
							</span>
						</div>
					</div>
				</div>

				<!-- 第二行:备注 | 元信息徽章 | 标签 -->
				<div class="flex items-center justify-between gap-4 min-h-[20px]">
					<p class="text-xs text-slate-400 truncate grow pr-4 font-medium">
						{{ task.note || '暂无备注' }}
					</p>

					<div class="flex items-center gap-2 shrink-0">
						<TaskCardMetaBadges :task="task" />

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
	import SpaceLabel from '@/components/SpaceLabel.vue'
	import { TASK_PRIORITY_STYLES } from '@/config/task'
	import type { TaskDto } from '@/services/api/tasks'
	import { computed } from 'vue'
	import TaskCardMetaBadges from './TaskCardMetaBadges.vue'

	const props = defineProps<{
		task: TaskDto
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
