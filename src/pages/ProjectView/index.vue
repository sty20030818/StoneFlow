<template>
	<div class="space-y-8">
		<!-- Project Header Card（仅在 project 模式下显示） -->
		<ProjectHeaderCard
			v-if="currentProject"
			:project="currentProject" />

		<WorkspaceLayout>
			<template #todo>
				<TaskColumn
					title="Todo"
					:tasks="todo"
					:loading="loading"
					empty-text="暂无待办任务"
					:show-complete-button="true"
					:show-space-label="showSpaceLabel"
					:show-inline-creator="true"
					:space-id="taskSpaceId"
					:project-id="projectId"
					:is-edit-mode="isEditMode"
					:selected-task-id-set="selectedTaskIds"
					@complete="onComplete"
					@task-click="onTaskClick"
					@toggle-task-select="toggleTaskSelect"
					@toggle-column-select="() => toggleColumnSelect(todo)"
					@request-task-delete="requestDeleteTask" />
			</template>

			<template #done>
				<TaskColumn
					title="Done"
					:tasks="doneAll"
					:loading="loading"
					empty-text="暂无完成记录"
					:show-time="true"
					:show-space-label="showSpaceLabel"
					:is-edit-mode="isEditMode"
					:selected-task-id-set="selectedTaskIds"
					@task-click="onTaskClick"
					@toggle-task-select="toggleTaskSelect"
					@toggle-column-select="() => toggleColumnSelect(doneAll)"
					@request-task-delete="requestDeleteTask" />
			</template>
		</WorkspaceLayout>

		<UModal
			v-model:open="confirmDeleteOpen"
			title="确认删除"
			description="确认是否删除选中的任务"
			:ui="{
				width: 'sm:max-w-lg',
				overlay: 'z-[120]',
				content: 'z-[121]',
			}">
			<template #body>
				<p class="text-sm text-muted">将删除 {{ deleteCount }} 个任务，可在回收站恢复。</p>
			</template>
			<template #footer>
				<UButton
					color="neutral"
					variant="ghost"
					size="sm"
					@click="closeDeleteConfirm">
					取消
				</UButton>
				<UButton
					color="error"
					size="sm"
					:loading="deleting"
					:disabled="deleteCount === 0"
					@click="confirmDelete">
					确认删除
				</UButton>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
	import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'
	import { useRoute } from 'vue-router'

	import TaskColumn from '@/components/TaskColumn.vue'
	import { useProjectBreadcrumb } from '@/composables/useProjectBreadcrumb'
	import ProjectHeaderCard from './components/ProjectHeaderCard.vue'
	import WorkspaceLayout from './components/WorkspaceLayout.vue'
	import { useProjectTasks } from './composables/useProjectTasks'
	import { deleteTasks, type TaskDto } from '@/services/api/tasks'
	import { useTaskInspectorStore } from '@/stores/taskInspector'
	import { useProjectsStore } from '@/stores/projects'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
	import { useSettingsStore } from '@/stores/settings'
	import { useWorkspaceEditStore } from '@/stores/workspace-edit'

	const route = useRoute()
	const projectsStore = useProjectsStore()
	const settingsStore = useSettingsStore()
	const refreshSignals = useRefreshSignalsStore()
	const workspaceEditStore = useWorkspaceEditStore()
	const toast = useToast()

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
	const { loading, todo, doneAll, refresh, onComplete } = useProjectTasks(taskSpaceId, projectId)

	const isEditMode = ref(false)
	const confirmDeleteOpen = ref(false)
	const deleting = ref(false)
	const selectedTaskIds = ref<Set<string>>(new Set())
	const deleteTargetIds = ref<string[] | null>(null)

	const selectedCount = computed(() => selectedTaskIds.value.size)
	const deleteCount = computed(() => deleteTargetIds.value?.length ?? selectedCount.value)

	function updateSelected(mutator: (next: Set<string>) => void) {
		const next = new Set(selectedTaskIds.value)
		mutator(next)
		selectedTaskIds.value = next
	}

	function enterEditMode() {
		isEditMode.value = true
	}

	function exitEditMode() {
		isEditMode.value = false
		confirmDeleteOpen.value = false
		deleteTargetIds.value = null
		selectedTaskIds.value = new Set()
	}

	function toggleTaskSelect(taskId: string) {
		if (!isEditMode.value) return
		updateSelected((set) => {
			if (set.has(taskId)) {
				set.delete(taskId)
				return
			}
			set.add(taskId)
		})
	}

	function toggleColumnSelect(tasks: TaskDto[]) {
		if (!isEditMode.value || tasks.length === 0) return
		const allSelectedInColumn = tasks.every((task) => selectedTaskIds.value.has(task.id))
		updateSelected((set) => {
			if (allSelectedInColumn) {
				tasks.forEach((task) => set.delete(task.id))
				return
			}
			tasks.forEach((task) => set.add(task.id))
		})
	}

	function openDeleteConfirm() {
		if (!isEditMode.value || selectedCount.value === 0) return
		deleteTargetIds.value = Array.from(selectedTaskIds.value)
		confirmDeleteOpen.value = true
	}

	function closeDeleteConfirm() {
		confirmDeleteOpen.value = false
		deleteTargetIds.value = null
	}

	async function confirmDelete() {
		if (deleteCount.value === 0 || deleting.value) return
		deleting.value = true
		try {
			const ids = deleteTargetIds.value ?? Array.from(selectedTaskIds.value)
			const deletedCount = await deleteTasks(ids)
			refreshSignals.bumpTask()
			await refresh(true)
			toast.add({
				title: '已移入回收站',
				description: `已删除 ${deletedCount} 项任务`,
				color: 'success',
			})
			exitEditMode()
		} catch (e) {
			toast.add({
				title: '删除失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			deleting.value = false
		}
	}

	function requestDeleteTask(taskId: string) {
		deleteTargetIds.value = [taskId]
		confirmDeleteOpen.value = true
	}

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
		() => {
			exitEditMode()
			if (spaceId.value) {
				void projectsStore.load(spaceId.value)
			}
		},
		{ immediate: true },
	)

	function pruneSelection() {
		if (selectedTaskIds.value.size === 0) return
		const existingIds = new Set([...todo.value, ...doneAll.value].map((task) => task.id))
		updateSelected((set) => {
			Array.from(set).forEach((id) => {
				if (!existingIds.has(id)) set.delete(id)
			})
		})
	}

	watch([todo, doneAll], () => {
		pruneSelection()
	})

	watch(confirmDeleteOpen, (open) => {
		if (!open) {
			deleteTargetIds.value = null
		}
	})

	watch([isEditMode, selectedCount], () => {
		workspaceEditStore.setState({
			isEditMode: isEditMode.value,
			selectedCount: selectedCount.value,
		})
	})

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

	onMounted(() => {
		workspaceEditStore.registerHandlers({
			enterEditMode,
			exitEditMode,
			openDeleteConfirm,
		})
		workspaceEditStore.setState({
			isEditMode: isEditMode.value,
			selectedCount: selectedCount.value,
		})
	})

	onUnmounted(() => {
		workspaceEditStore.clearHandlers()
	})

	function onTaskClick(task: TaskDto) {
		if (isEditMode.value) return
		inspectorStore.open(task)
	}
</script>
