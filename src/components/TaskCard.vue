<template>
	<!-- Doing 状态：左侧蓝色边框，大卡片 -->
	<div
		v-if="task.status === 'doing'"
		class="bg-default rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group border-t border-b border-r border-default/80 border-l-4 border-l-blue-500"
		@click="$emit('click', task)">
		<div class="flex gap-4">
			<!-- 左侧：已选中的圆形复选框 -->
			<div
				@click.stop="$emit('complete', task.id)"
				class="mt-1 w-6 h-6 shrink-0 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
				<div class="w-3 h-3 rounded-full bg-blue-500"></div>
			</div>

			<!-- 右侧：内容堆叠 -->
			<div class="flex-1 min-w-0">
				<!-- 第一行：标题和优先级 -->
				<div class="flex justify-between items-start mb-2">
					<h4 class="text-base font-bold text-default leading-tight group-hover:text-blue-600 transition-colors">
						{{ task.title }}
					</h4>
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
		v-else-if="task.status === 'todo'"
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
				v-if="showSpaceLabel || task.tags.length > 0 || (showTime && task.completed_at)">
				<SpaceLabel
					v-if="showSpaceLabel"
					:space-id="task.space_id" />
				<span
					v-for="tag in task.tags"
					:key="tag"
					class="text-[10px] font-bold text-muted bg-elevated px-1.5 py-0.5 rounded">
					#{{ tag }}
				</span>
				<TimeDisplay
					v-if="showTime && task.completed_at"
					:timestamp="task.completed_at"
					text-class="text-[10px] font-bold text-muted ml-auto" />
			</div>
		</div>
	</div>

	<!-- Done 状态：最简洁，绿色勾选，删除线 -->
	<div
		v-else-if="task.status === 'done'"
		class="flex items-center gap-4 p-4 bg-elevated rounded-2xl border border-transparent hover:border-default/80 transition-colors opacity-50 hover:opacity-100"
		@click="$emit('click', task)">
		<div class="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-green-100 text-green-600">
			<UIcon
				name="i-lucide-check"
				class="size-3" />
		</div>
		<span class="text-muted font-medium line-through">{{ task.title }}</span>
		<TimeDisplay
			v-if="showTime && task.completed_at"
			:timestamp="task.completed_at"
			text-class="ml-auto text-xs text-muted shrink-0" />
	</div>
</template>

<script setup lang="ts">
	import PriorityBadge from '@/components/PriorityBadge.vue'
	import SpaceLabel from '@/components/SpaceLabel.vue'
	import TimeDisplay from '@/components/TimeDisplay.vue'
	import type { TaskDto } from '@/services/api/tasks'

	defineProps<{
		task: TaskDto
		showCompleteButton?: boolean
		showTime?: boolean
		showSpaceLabel?: boolean
	}>()

	defineEmits<{
		click: [task: TaskDto]
		complete: [taskId: string]
	}>()
</script>

