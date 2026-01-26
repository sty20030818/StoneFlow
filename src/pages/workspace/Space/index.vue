<template>
	<div class="space-y-8">
		<!-- Project Header Card（v3 风格：更紧凑，降低高度） -->
		<div
			v-if="currentProject"
			class="mb-6 bg-default rounded-3xl p-6 border border-default/80 shadow-sm relative overflow-hidden group">
			<!-- 彩色模糊背景 -->
			<div class="absolute -top-10 -right-10 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl opacity-60"></div>
			<div class="absolute top-20 right-20 w-32 h-32 bg-purple-100/50 rounded-full blur-2xl opacity-60"></div>

			<div class="relative z-10 flex justify-between items-start">
				<div class="max-w-2xl flex-1 min-w-0">
					<div class="flex items-center gap-3 mb-2">
						<h1 class="text-2xl font-black text-default tracking-tight truncate">
							{{ currentProject.name }}
						</h1>
						<div class="w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse shrink-0"></div>
					</div>
					<p
						v-if="currentProject.note"
						class="text-muted font-medium text-sm leading-relaxed line-clamp-2">
						{{ currentProject.note }}
					</p>
				</div>

				<!-- 圆形进度条（更小） -->
				<div class="relative w-16 h-16 flex items-center justify-center shrink-0 ml-4">
					<svg class="transform -rotate-90 w-16 h-16">
						<circle
							cx="32"
							cy="32"
							r="26"
							stroke="currentColor"
							stroke-width="5"
							fill="transparent"
							class="text-elevated" />
						<circle
							cx="32"
							cy="32"
							r="26"
							stroke="currentColor"
							stroke-width="5"
							fill="transparent"
							:stroke-dasharray="26 * 2 * 3.14"
							:stroke-dashoffset="26 * 2 * 3.14 * (1 - progressPercent / 100)"
							class="text-blue-500"
							stroke-linecap="round" />
					</svg>
					<div class="absolute inset-0 flex flex-col items-center justify-center">
						<span class="text-xs font-black text-default">{{ progressPercent }}%</span>
					</div>
				</div>
			</div>
		</div>

		<WorkspaceLayout>
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
	</div>
</template>

<script setup lang="ts">
	import { computed, provide, ref, watch } from 'vue'
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

	// 当前项目数据
	const currentProject = computed(() => {
		const pid = projectId.value
		if (!pid) return null
		const list = projectsStore.getProjectsOfSpace(spaceId.value)
		return list.find((p) => p.id === pid) ?? null
	})

	// 进度统计
	const totalTasks = computed(() => doing.value.length + todo.value.length)
	const progressPercent = computed(() => {
		const total = totalTasks.value + doneToday.value.length
		if (total === 0) return 0
		return Math.round((doneToday.value.length / total) * 100)
	})

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
		const base: { label: string; to?: string }[] = []
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

	const inspectorStore = useTaskInspectorStore()

	// 通过 provide 传递 viewMode 和 breadcrumbItems 给 Header
	provide('workspaceViewMode', viewMode)
	provide('workspaceBreadcrumbItems', breadcrumbItems)
	provide('headerViewModeUpdate', (mode: 'list' | 'board') => {
		viewMode.value = mode
	})

	function onTaskClick(task: TaskDto) {
		inspectorStore.open(task)
	}
</script>
