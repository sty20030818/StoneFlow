<template>
	<section>
		<!-- 简单的标题（不带 Card 包裹） -->
		<div class="flex items-center gap-3 mb-4 px-2">
			<!-- 动画指示器（根据状态不同） -->
			<span
				v-if="title === '进行中'"
				class="flex h-3 w-3 relative">
				<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
				<span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
			</span>
			<div
				v-else-if="title === '待办'"
				class="w-2 h-2 rounded-full bg-muted"></div>
			<UIcon
				v-else-if="title.includes('已完成')"
				name="i-lucide-check-circle"
				class="size-4 text-green-500" />
			<h3
				class="text-base font-extrabold"
				:class="title === '进行中' ? 'text-default' : title === '待办' ? 'text-muted' : 'text-muted'">
				{{ title }}
			</h3>
		</div>

		<!-- 任务列表 -->
		<template v-if="loading">
			<div class="space-y-3">
				<div
					v-for="i in skeletonCount"
					:key="i"
					class="p-3 rounded-md border border-default bg-elevated flex items-center justify-between gap-3">
					<div class="space-y-2 flex-1">
						<USkeleton class="h-4 w-3/4" />
						<USkeleton
							v-if="showSpaceLabel"
							class="h-3 w-16" />
					</div>
					<USkeleton
						v-if="showCompleteButton"
						class="h-8 w-14 rounded-md" />
					<USkeleton
						v-if="showTime"
						class="h-3 w-12" />
				</div>
			</div>
		</template>
		<template v-else>
			<div
				v-if="tasks.length === 0"
				class="py-12 flex flex-col items-center justify-center text-muted border-2 border-dashed border-default/60 rounded-3xl">
				<UIcon
					name="i-lucide-coffee"
					class="size-10 mb-2" />
				<span class="font-medium">{{ emptyText }}</span>
			</div>

			<div
				v-else
				class="space-y-3">
				<TaskCard
					v-for="t in tasks"
					:key="t.id"
					:task="t"
					:show-complete-button="showCompleteButton"
					:show-time="showTime"
					:show-space-label="showSpaceLabel"
					@click="$emit('task-click', t)"
					@complete="$emit('complete', t.id)" />
			</div>
		</template>
	</section>
</template>

<script setup lang="ts">
	import TaskCard from '@/components/TaskCard.vue'
	import type { TaskDto } from '@/services/api/tasks'

	defineProps<{
		title: string
		tasks: TaskDto[]
		loading: boolean
		emptyText: string
		showCompleteButton?: boolean
		showTime?: boolean
		showSpaceLabel?: boolean
		skeletonCount?: number
	}>()

	defineEmits<{
		complete: [taskId: string]
		'task-click': [task: TaskDto]
	}>()
</script>
