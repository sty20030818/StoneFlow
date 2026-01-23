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
				:skeleton-count="2"
				@task-click="onTaskClick" />
		</template>
	</WorkspaceLayout>
</template>

<script setup lang="ts">
	import { computed, ref } from 'vue'
	import { useRoute } from 'vue-router'

	import TaskColumn from '@/components/TaskColumn.vue'
	import WorkspaceLayout from '@/components/WorkspaceLayout.vue'
	import { useSpaceTasks } from '@/composables/useSpaceTasks'
	import type { TaskDto } from '@/services/api/tasks'
	import { useTaskInspectorStore } from '@/stores/taskInspector'

	const route = useRoute()
	const spaceId = computed(() => route.params.spaceId as string)

	const { loading, doing, todo, doneToday, onComplete } = useSpaceTasks(spaceId)

	const viewMode = ref<'list' | 'board'>('list')

	const breadcrumbItems = computed(() => {
		const sid = spaceId.value
		const labelMap: Record<string, string> = {
			work: 'Work',
			personal: 'Personal',
			study: 'Study',
		}
		return [
			{ label: 'Space', to: '/all-tasks' },
			{ label: labelMap[sid] ?? sid },
		]
	})

	function onViewModeChange(mode: 'list' | 'board') {
		viewMode.value = mode
	}

	const inspectorStore = useTaskInspectorStore()

	function onTaskClick(task: TaskDto) {
		inspectorStore.open(task)
	}
</script>
