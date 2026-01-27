<template>
	<!-- Doing/Paused 状态：左侧蓝色边框，大卡片 -->
	<div
		v-if="isDoingGroup"
		class="bg-default rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group border-t border-b border-r border-default/80 border-l-4"
		:class="isPausedStatus ? 'border-l-slate-400' : 'border-l-blue-500'"
		@click="$emit('click', task)">
		<div class="flex gap-4">
			<!-- 左侧：已选中的圆形复选框 -->
			<div
				@click.stop="$emit('complete', task.id)"
				class="mt-1 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer"
				:class="
					isPausedStatus
						? 'border-slate-400 text-slate-400 hover:bg-slate-50'
						: 'border-blue-500 text-blue-500 hover:bg-blue-50'
				">
				<div
					v-if="!isPausedStatus"
					class="w-3 h-3 rounded-full bg-blue-500"></div>
				<UIcon
					v-else
					name="i-lucide-pause"
					class="size-3" />
			</div>

			<!-- 右侧：内容堆叠 -->
			<div class="flex-1 min-w-0">
				<!-- 第一行：标题和优先级 -->
				<div class="flex justify-between items-start mb-2">
					<div class="flex items-center gap-2 min-w-0 flex-1">
						<h4
							class="text-base font-bold text-default leading-tight transition-colors"
							:class="isPausedStatus ? 'group-hover:text-slate-600' : 'group-hover:text-blue-600'">
							{{ task.title }}
						</h4>
						<UBadge
							v-if="isPausedStatus"
							size="xs"
							color="neutral"
							variant="soft">
							已暂停
						</UBadge>
					</div>
					<PriorityBadge
						:priority="task.priority"
						variant="doing" />
				</div>

				<!-- 第二行：Note -->
				<p
					v-if="task.note"
					class="text-sm text-muted font-medium line-clamp-2 mb-3 leading-relaxed">
					{{ task.note }}
				</p>

				<!-- 第三行：Meta Tags -->
				<div class="flex items-center flex-wrap gap-2 mt-auto pt-2 border-t border-default/50">
					<SpaceLabel
						v-if="showSpaceLabel"
						:space-id="task.space_id" />
					<span
						v-for="tag in task.tags"
						:key="tag"
						class="px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">
						#{{ tag }}
					</span>
					<div
						v-if="task.planned_end_at"
						class="flex items-center gap-1.5 text-sky-600 bg-sky-50 px-2 py-1 rounded-lg">
						<UIcon
							name="i-lucide-calendar"
							class="size-3" />
						<span class="text-[10px] font-medium">
							{{ formatDueDate(task.planned_end_at) }}
						</span>
					</div>
					<div
						v-if="showTime && task.completed_at"
						class="ml-auto flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
						<UIcon
							name="i-lucide-clock"
							class="size-3" />
						<TimeDisplay :timestamp="task.completed_at" />
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Todo 状态：简洁设计，未选中复选框 -->
	<div
		v-else-if="displayStatus === 'todo'"
		class="bg-default rounded-2xl p-4 border border-default/80 hover:border-default hover:shadow-md transition-all cursor-pointer group flex gap-4 items-start"
		@click="$emit('click', task)">
		<!-- 复选框 -->
		<div
			@click.stop="$emit('complete', task.id)"
			class="mt-1 w-6 h-6 rounded-full border-2 border-default/60 hover:border-default transition-colors shrink-0 cursor-pointer"></div>

		<div class="flex-1 min-w-0">
			<div class="flex justify-between items-start">
				<span class="font-bold text-default text-base group-hover:text-default transition-colors">
					{{ task.title }}
				</span>
				<PriorityBadge
					:priority="task.priority"
					variant="todo" />
			</div>

			<p
				v-if="task.note"
				class="text-xs text-muted mt-1 line-clamp-1">
				{{ task.note }}
			</p>

			<div
				class="flex items-center gap-2 mt-3"
				v-if="showSpaceLabel || task.tags.length > 0 || task.planned_end_at || (showTime && task.completed_at)">
				<SpaceLabel
					v-if="showSpaceLabel"
					:space-id="task.space_id" />
				<span
					v-for="tag in task.tags"
					:key="tag"
					class="text-[10px] font-bold text-muted bg-elevated px-1.5 py-0.5 rounded">
					#{{ tag }}
				</span>
				<div
					v-if="task.planned_end_at"
					class="flex items-center gap-1 text-sky-600 text-[10px]">
					<UIcon
						name="i-lucide-calendar"
						class="size-3" />
					<span class="font-medium">
						{{ formatDueDate(task.planned_end_at) }}
					</span>
				</div>
				<TimeDisplay
					v-if="showTime && task.completed_at"
					:timestamp="task.completed_at"
					text-class="text-[10px] font-bold text-muted ml-auto" />
			</div>
		</div>
	</div>

	<!-- Done/Abandoned 状态：最简洁，绿色勾选，删除线 -->
	<div
		v-else-if="isDoneGroup"
		class="flex items-center gap-4 p-4 bg-elevated rounded-2xl border border-transparent hover:border-default/80 transition-colors opacity-50 hover:opacity-100"
		@click="$emit('click', task)">
		<div
			class="w-6 h-6 shrink-0 flex items-center justify-center rounded-full"
			:class="isAbandonedStatus ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-600'">
			<UIcon
				:name="isAbandonedStatus ? 'i-lucide-x-circle' : 'i-lucide-check'"
				class="size-3" />
		</div>
		<div class="flex items-center gap-2 min-w-0 flex-1">
			<span class="text-muted font-medium line-through">{{ task.title }}</span>
			<UBadge
				v-if="isAbandonedStatus"
				size="xs"
				color="neutral"
				variant="soft">
				已放弃
			</UBadge>
		</div>
		<TimeDisplay
			v-if="showTime && task.completed_at"
			:timestamp="task.completed_at"
			text-class="ml-auto text-xs text-muted shrink-0" />
	</div>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import PriorityBadge from '@/components/PriorityBadge.vue'
	import SpaceLabel from '@/components/SpaceLabel.vue'
	import TimeDisplay from '@/components/TimeDisplay.vue'
	import type { TaskDto } from '@/services/api/tasks'
	import { getDisplayStatus, isPaused, isAbandoned } from '@/utils/task'

	const props = defineProps<{
		task: TaskDto
		showCompleteButton?: boolean
		showTime?: boolean
		showSpaceLabel?: boolean
	}>()

	defineEmits<{
		click: [task: TaskDto]
		complete: [taskId: string]
	}>()

	const displayStatus = computed(() => getDisplayStatus(props.task.status))
	const isDoingGroup = computed(() => displayStatus.value === 'doing')
	const isDoneGroup = computed(() => displayStatus.value === 'done')
	const isPausedStatus = computed(() => isPaused(props.task.status))
	const isAbandonedStatus = computed(() => isAbandoned(props.task.status))

	function formatDueDate(timestamp: number): string {
		const date = new Date(timestamp)
		const now = new Date()
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
		const dueDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
		const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

		if (diffDays === 0) return '今天'
		if (diffDays === 1) return '明天'
		if (diffDays === -1) return '昨天'
		if (diffDays > 0 && diffDays <= 7) return `${diffDays}天后`
		if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}天前`

		// 超过一周，显示具体日期
		return date.toLocaleDateString('zh-CN', {
			month: 'short',
			day: 'numeric',
		})
	}
</script>
