<template>
	<div class="space-y-8">
		<!-- Project Header Card（仅在 project 模式下显示） -->
		<ProjectHeaderCard
			v-if="currentProject"
			:project="currentProject" />

		<WorkspaceLayout>
			<template #in-progress>
				<TaskColumn
					title="进行中"
					:tasks="doing"
					:loading="loading"
					empty-text="暂无进行中任务"
					:show-complete-button="true"
					:show-space-label="showSpaceLabel"
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
					:show-space-label="showSpaceLabel"
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
					:show-space-label="showSpaceLabel"
					:skeleton-count="2"
					@task-click="onTaskClick" />
			</template>
		</WorkspaceLayout>
	</div>
</template>

<script setup lang="ts">
	import { computed, provide, ref, watch } from 'vue'
	import { useRoute } from 'vue-router'

	import TaskColumn from '@/components/TaskColumn.vue'
	import { useProjectBreadcrumb } from '@/composables/useProjectBreadcrumb'
	import ProjectHeaderCard from './components/ProjectHeaderCard.vue'
	import WorkspaceLayout from './components/WorkspaceLayout.vue'
	import { useProjectTasks } from './composables/useProjectTasks'
	import type { TaskDto } from '@/services/api/tasks'
	import { useTaskInspectorStore } from '@/stores/taskInspector'
	import { useProjectsStore } from '@/stores/projects'
	import { useSettingsStore } from '@/stores/settings'

	const route = useRoute()
	const projectsStore = useProjectsStore()
	const settingsStore = useSettingsStore()

	// 从路由参数获取 spaceId 和 projectId
	// All Tasks 模式：spaceId=undefined, projectId=undefined
	// Project 模式：spaceId 有值, projectId 有值
	const spaceId = computed(() => {
		const sid = route.params.spaceId
		return typeof sid === 'string' ? sid : undefined
	})

	const projectId = computed(() => {
		// 如果路由有 project 参数，使用它
		const pid = route.query.project
		if (typeof pid === 'string') return pid
		return null
	})

	const taskSpaceId = computed(() => {
		if (route.path === '/all-tasks') {
			return settingsStore.settings.activeSpaceId
		}
		return spaceId.value
	})

	// 统一使用 useProjectTasks composable
	const { loading, doing, todo, doneToday, onComplete } = useProjectTasks(taskSpaceId, projectId)

	// 当前项目数据（仅在 project 模式下有值）
	const currentProject = computed(() => {
		const pid = projectId.value
		if (!pid || !spaceId.value) return null
		const list = projectsStore.getProjectsOfSpace(spaceId.value)
		return list.find((p) => p.id === pid) ?? null
	})

	// 是否显示 Space 标签（All Tasks 模式显示）
	const showSpaceLabel = computed(() => !spaceId.value)

	// 监听路由变化，加载项目列表
	watch(
		() => [route.params.spaceId, route.query.project],
		async () => {
			if (spaceId.value) {
				await projectsStore.loadForSpace(spaceId.value)
			}
		},
		{ immediate: true },
	)

	const viewMode = ref<'list' | 'board'>('list')

	// 使用 composable 生成 breadcrumb
	const projectsList = computed(() => {
		if (!spaceId.value) return []
		return projectsStore.getProjectsOfSpace(spaceId.value)
	})

	const breadcrumbItems = useProjectBreadcrumb(spaceId, projectId, projectsList)

	const inspectorStore = useTaskInspectorStore()

	// 通过 provide 传递 viewMode 和 breadcrumbItems 给 Header（如果需要）
	provide('workspaceViewMode', viewMode)
	provide('workspaceBreadcrumbItems', breadcrumbItems)
	provide('headerViewModeUpdate', (mode: 'list' | 'board') => {
		viewMode.value = mode
	})

	function onTaskClick(task: TaskDto) {
		inspectorStore.open(task)
	}
</script>
