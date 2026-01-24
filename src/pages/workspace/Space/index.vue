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
	import { computed, ref, watch } from 'vue'
	import { useRoute } from 'vue-router'

	import TaskColumn from '@/components/TaskColumn.vue'
	import WorkspaceLayout from '@/components/WorkspaceLayout.vue'
	import { useSpaceTasks } from '@/composables/useSpaceTasks'
	import type { ProjectDto } from '@/services/api/projects'
	import { getOrCreateDefaultProject } from '@/services/api/projects'
	import type { TaskDto } from '@/services/api/tasks'
	import { useTaskInspectorStore } from '@/stores/taskInspector'
	import { useProjectsStore } from '@/stores/projects'

	const route = useRoute()
	const spaceId = computed(() => route.params.spaceId as string)
	const defaultProject = ref<ProjectDto | null>(null)
	const projectsStore = useProjectsStore()

	const projectId = computed(() => {
		const pid = route.query.project
		if (typeof pid === 'string') return pid
		return defaultProject.value?.id ?? null
	})

	const { loading, doing, todo, doneToday, onComplete } = useSpaceTasks(spaceId, projectId)

	async function loadDefaultProject() {
		if (!route.query.project) {
			try {
				const project = await getOrCreateDefaultProject(spaceId.value)
				defaultProject.value = project
			} catch (error) {
				console.error('加载默认项目失败:', error)
			}
		} else {
			defaultProject.value = null
		}
	}

	watch(
		() => [route.query.project, spaceId.value],
		async () => {
			await projectsStore.loadForSpace(spaceId.value)
			loadDefaultProject()
		},
		{ immediate: true },
	)

	const viewMode = ref<'list' | 'board'>('list')

	/** 从 project 列表按 parent_id 回溯，得到 root → … → current 的层级路径 */
	function projectPath(list: ProjectDto[], targetId: string): ProjectDto[] {
		const byId = new Map(list.map((p) => [p.id, p]))
		const out: ProjectDto[] = []
		let curr: ProjectDto | undefined = byId.get(targetId)
		while (curr) {
			out.unshift(curr)
			curr = curr.parent_id ? byId.get(curr.parent_id) : undefined
		}
		return out
	}

	const breadcrumbItems = computed(() => {
		const sid = spaceId.value
		const labelMap: Record<string, string> = {
			work: 'Work',
			personal: 'Personal',
			study: 'Study',
		}
		const base: { label: string; to?: string }[] = [
			{ label: 'Space', to: '/all-tasks' },
			{ label: labelMap[sid] ?? sid, to: `/space/${sid}` },
		]
		const pid = projectId.value
		if (!pid) return base
		if (route.query.project) {
			const list = projectsStore.getProjectsOfSpace(sid)
			const path = projectPath(list, pid)
			if (path.length) {
				for (let i = 0; i < path.length; i++) {
					const p = path[i]
					const isLast = i === path.length - 1
					base.push({ label: p.name, ...(isLast ? {} : { to: `/space/${sid}?project=${p.id}` }) })
				}
			} else {
				base.push({ label: '…' })
			}
		} else {
			base.push({ label: defaultProject.value?.name ?? '…' })
		}
		return base
	})

	function onViewModeChange(mode: 'list' | 'board') {
		viewMode.value = mode
	}

	const inspectorStore = useTaskInspectorStore()

	function onTaskClick(task: TaskDto) {
		inspectorStore.open(task)
	}
</script>
