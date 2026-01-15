<template>
	<section class="space-y-4">
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<TaskColumn
				title="进行中"
				:tasks="doing"
				:loading="loading"
				empty-text="暂无进行中任务"
				:show-complete-button="true"
				:show-space-label="true"
				:skeleton-count="2"
				@complete="onComplete"
				@task-click="onTaskClick" />

			<TaskColumn
				title="待办"
				:tasks="todo"
				:loading="loading"
				empty-text="暂无待办任务"
				:show-complete-button="true"
				:show-space-label="true"
				:skeleton-count="2"
				@complete="onComplete"
				@task-click="onTaskClick" />

			<TaskColumn
				title="已完成（今天）"
				:tasks="doneToday"
				:loading="loading"
				empty-text="今天还没有完成记录"
				:show-time="true"
				:show-space-label="true"
				:skeleton-count="2"
				@task-click="onTaskClick" />
		</div>
	</section>
</template>

<script setup lang="ts">
	import TaskColumn from '@/components/TaskColumn.vue'
	import type { TaskDto } from '@/services/api/tasks'

	import { useAllTasks } from './composables/useAllTasks'

	const { loading, doing, todo, doneToday, onComplete } = useAllTasks()

	function onTaskClick(task: TaskDto) {
		console.log('Task clicked:', task)
	}
</script>
