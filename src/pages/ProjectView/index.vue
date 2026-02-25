<template>
	<div class="space-y-8">
		<!-- Project Header Card（仅在 project 模式下显示） -->
		<div
			v-if="currentProject"
			v-motion="projectHeaderMotion">
			<ProjectHeaderCard
				:project="currentProject"
				@open-settings="openProjectSettings" />
		</div>

		<div v-motion="workspaceColumnsMotion">
			<WorkspaceLayout>
				<template #todo>
					<TaskColumn
						:title="t('projectView.columns.todo')"
						column-status="todo"
						:tasks="todo"
						:loading="loading"
						:empty-text="t('projectView.empty.todo')"
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
						:title="t('projectView.columns.done')"
						column-status="done"
						:tasks="doneAll"
						:loading="loading"
						:empty-text="t('projectView.empty.done')"
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
		</div>

		<UModal
			v-model:open="confirmDeleteOpen"
			:title="t('projectView.deleteModal.title')"
			:description="t('projectView.deleteModal.description')"
			:ui="deleteModalUi">
			<template #body>
				<p class="text-sm text-muted">{{ t('projectView.deleteModal.body', { count: deleteCount }) }}</p>
			</template>
			<template #footer>
				<UButton
					color="neutral"
					variant="ghost"
					size="sm"
					@click="closeDeleteConfirm">
					{{ t('common.actions.cancel') }}
				</UButton>
				<UButton
					color="error"
					size="sm"
					:loading="deleting"
					:disabled="deleteCount === 0"
					@click="confirmDelete">
					{{ t('projectView.deleteModal.confirm') }}
				</UButton>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { watchDebounced, watchThrottled } from '@vueuse/core'
	import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'
	import { useRoute } from 'vue-router'

	import TaskColumn from '@/components/TaskColumn.vue'
	import { useProjectMotionPreset } from '@/composables/base/motion'
	import { useNullableStringRouteQuery } from '@/composables/base/route-query'
	import { createModalLayerUi } from '@/config/ui-layer'
	import { useProjectBreadcrumb } from '@/composables/useProjectBreadcrumb'
	import ProjectHeaderCard from './components/ProjectHeaderCard.vue'
	import WorkspaceLayout from './components/WorkspaceLayout.vue'
	import { useProjectTasks } from './composables/useProjectTasks'
	import { deleteTasks, type TaskDto } from '@/services/api/tasks'
	import { useTaskInspectorStore } from '@/stores/taskInspector'
	import { useProjectInspectorStore } from '@/stores/projectInspector'
	import { useProjectsStore } from '@/stores/projects'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
	import { useSettingsStore } from '@/stores/settings'
	import { useWorkspaceEditStore } from '@/stores/workspace-edit'
	import { resolveErrorMessage } from '@/utils/error-message'

	const route = useRoute()
	const { t } = useI18n({ useScope: 'global' })
	const routeProjectId = useNullableStringRouteQuery('project')
	const projectsStore = useProjectsStore()
	const settingsStore = useSettingsStore()
	const refreshSignals = useRefreshSignalsStore()
	const workspaceEditStore = useWorkspaceEditStore()
	const projectInspectorStore = useProjectInspectorStore()
	const toast = useToast()
	const deleteModalUi = createModalLayerUi({
		width: 'sm:max-w-lg',
	})
	const projectHeaderMotion = useProjectMotionPreset('drawerSection', 'headerBreadcrumb')
	const workspaceColumnsMotion = useProjectMotionPreset('drawerSection', 'headerActions')

	// 从路由参数获取 spaceId 和 projectId
	// All Tasks 模式：spaceId=undefined, projectId=undefined
	// Project 模式：spaceId 有值, projectId 有值
	const spaceId = computed(() => {
		const sid = route.params.spaceId
		return typeof sid === 'string' ? sid : undefined
	})

	const projectId = computed(() => {
		return routeProjectId.value
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
				title: t('projectView.toast.deletedTitle'),
				description: t('projectView.toast.deletedDescription', { count: deletedCount }),
				color: 'success',
			})
			exitEditMode()
		} catch (e) {
			toast.add({
				title: t('projectView.toast.deleteFailedTitle'),
				description: resolveErrorMessage(e, t),
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
	watchDebounced(
		() => [route.params.spaceId, routeProjectId.value],
		() => {
			exitEditMode()
			if (spaceId.value) {
				void projectsStore.load(spaceId.value)
			}
		},
		{
			immediate: true,
			debounce: 80,
			maxWait: 240,
		},
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

	watchThrottled(
		[todo, doneAll],
		() => {
			pruneSelection()
		},
		{ throttle: 120, trailing: true },
	)

	watch(confirmDeleteOpen, (open) => {
		if (!open) {
			deleteTargetIds.value = null
		}
	})

	watchThrottled(
		[isEditMode, selectedCount],
		() => {
			workspaceEditStore.setState({
				isEditMode: isEditMode.value,
				selectedCount: selectedCount.value,
			})
		},
		{ throttle: 120, trailing: true },
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

	function openProjectSettings() {
		if (!currentProject.value) return
		projectInspectorStore.open(currentProject.value)
	}
</script>
