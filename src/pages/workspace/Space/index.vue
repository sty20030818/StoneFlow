<template>
	<section class="space-y-4">
		<SpaceHeader :space-id="spaceId" />

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<TaskColumn
				title="进行中"
				:tasks="doing"
				:loading="loading"
				empty-text="暂无进行中任务"
				:show-complete-button="true"
				:skeleton-count="2"
				@complete="onComplete"
				@task-click="onTaskClick" />

			<TaskColumn
				title="待办"
				:tasks="todo"
				:loading="loading"
				empty-text="暂无待办任务"
				:show-complete-button="true"
				:skeleton-count="2"
				@complete="onComplete"
				@task-click="onTaskClick" />

			<TaskColumn
				title="已完成（今天）"
				:tasks="doneToday"
				:loading="loading"
				empty-text="今天还没有完成记录"
				:show-time="true"
				:skeleton-count="2"
				@task-click="onTaskClick" />
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useRoute } from 'vue-router'

	import TaskColumn from '@/components/TaskColumn.vue'
	import { useSpaceTasks } from '@/composables/useSpaceTasks'
	import type { TaskDto } from '@/services/api/tasks'

	import SpaceHeader from './components/SpaceHeader.vue'

	const route = useRoute()
	const spaceId = computed(() => route.params.spaceId as string)

	const { loading, doing, todo, doneToday, onComplete } = useSpaceTasks(spaceId)

	function onTaskClick(task: TaskDto) {
		console.log('Task clicked:', task)
	}
</script>
