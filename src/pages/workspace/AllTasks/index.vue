<template>
	<WorkspaceLayout
		:breadcrumb-items="breadcrumbItems"
		:view-mode="viewMode"
		@update:viewMode="onViewModeChange">
		<template #in-progress>
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
		</template>

		<template #todo>
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
		</template>

		<template #done>
			<TaskColumn
				title="已完成（今天）"
				:tasks="doneToday"
				:loading="loading"
				empty-text="今天还没有完成记录"
				:show-time="true"
				:show-space-label="true"
				:skeleton-count="2"
				@task-click="onTaskClick" />
		</template>
	</WorkspaceLayout>
</template>

<script setup lang="ts">
	import { computed, ref } from 'vue'

	import TaskColumn from '@/components/TaskColumn.vue'
	import WorkspaceLayout from '@/components/WorkspaceLayout.vue'
	import type { TaskDto } from '@/services/api/tasks'
	import { useTaskInspectorStore } from '@/stores/taskInspector'

	import { useAllTasks } from './composables/useAllTasks'

	const { loading, doing, todo, doneToday, onComplete } = useAllTasks()

	const viewMode = ref<'list' | 'board'>('list')
	const breadcrumbItems = computed(() => [{ label: 'Space', to: '/dashboard' }, { label: 'All Tasks' }])

	function onViewModeChange(mode: 'list' | 'board') {
		viewMode.value = mode
	}

	const inspectorStore = useTaskInspectorStore()

	function onTaskClick(task: TaskDto) {
		inspectorStore.open(task)
	}
</script>
