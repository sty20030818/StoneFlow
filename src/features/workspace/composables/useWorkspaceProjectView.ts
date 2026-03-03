import { useI18n } from 'vue-i18n'
import { watchDebounced, watchThrottled } from '@vueuse/core'
import { computed, inject, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'

import { useNullableStringRouteQuery } from '@/composables/base/route-query'
import { useProjectInspectorStore } from '@/stores/projectInspector'
import { useProjectsStore } from '@/stores/projects'
import { useSettingsStore } from '@/stores/settings'
import { useTaskInspectorStore } from '@/stores/taskInspector'
import { useWorkspaceEditStore, type WorkspaceEditCommand } from '@/stores/workspace-edit'
import { resolveErrorMessage } from '@/utils/error-message'
import { invalidateWorkspaceTaskAndProjectQueries, type WorkspaceTask } from '../model'
import { deleteWorkspaceTasks } from '../mutations'
import { useWorkspaceProjectBreadcrumb } from './useWorkspaceProjectBreadcrumb'
import { useWorkspaceProjectTasks } from './useWorkspaceProjectTasks'

function createWorkspaceEditContextId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID()
	}
	return `workspace-edit-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * ProjectView 页面级业务编排：
 * - 任务看板数据装配
 * - 编辑态批量选择/删除
 * - 命令总线同步（workspace-edit store）
 * - 任务/项目抽屉触发与面包屑提供
 */
export function useWorkspaceProjectView() {
	const route = useRoute()
	const { t } = useI18n({ useScope: 'global' })
	const routeProjectId = useNullableStringRouteQuery('project')
	const projectsStore = useProjectsStore()
	const settingsStore = useSettingsStore()
	const workspaceEditStore = useWorkspaceEditStore()
	const projectInspectorStore = useProjectInspectorStore()
	const taskInspectorStore = useTaskInspectorStore()
	const openCreateTaskModal = inject<(spaceId?: string) => void>('openCreateTaskModal')
	const toast = useToast()
	const workspaceEditContextId = createWorkspaceEditContextId()

	const spaceId = computed(() => {
		const value = route.params.spaceId
		return typeof value === 'string' ? value : undefined
	})
	const projectId = computed(() => routeProjectId.value)
	const taskSpaceId = computed(() => {
		if (route.path === '/all-tasks') return settingsStore.settings.activeSpaceId
		return spaceId.value
	})
	const collapseResetKey = computed(() => `${route.path}|${spaceId.value ?? 'all'}|${projectId.value ?? 'none'}`)
	const showSpaceLabel = computed(() => !spaceId.value)

	const { loading, todo, doneAll, refresh, onComplete } = useWorkspaceProjectTasks(taskSpaceId, projectId)

	const isEditMode = ref(false)
	const confirmDeleteOpen = ref(false)
	const deleting = ref(false)
	const selectedTaskIds = ref<Set<string>>(new Set())
	const deleteTargetIds = ref<string[] | null>(null)
	const columnStickyOffset = computed(() => (isEditMode.value ? 48 : 0))

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

	function toggleColumnSelect(tasks: WorkspaceTask[]) {
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
			const deletedCount = await deleteWorkspaceTasks(ids)
			await invalidateWorkspaceTaskAndProjectQueries()
			await refresh()
			toast.add({
				title: t('projectView.toast.deletedTitle'),
				description: t('projectView.toast.deletedDescription', { count: deletedCount }),
				color: 'success',
			})
			exitEditMode()
		} catch (error) {
			toast.add({
				title: t('projectView.toast.deleteFailedTitle'),
				description: resolveErrorMessage(error, t),
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

	function onCreateTaskRequest() {
		openCreateTaskModal?.(taskSpaceId.value)
	}

	const currentProject = computed(() => {
		const currentProjectId = projectId.value
		if (!currentProjectId || !spaceId.value) return null
		const projects = projectsStore.getProjectsOfSpace(spaceId.value)
		return projects.find((project) => project.id === currentProjectId) ?? null
	})

	watchDebounced(
		() => [route.params.spaceId, routeProjectId.value],
		() => {
			exitEditMode()
			if (!spaceId.value) return
			void projectsStore.load(spaceId.value)
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
		if (!open) deleteTargetIds.value = null
	})

	watchThrottled(
		[isEditMode, selectedCount],
		() => {
			workspaceEditStore.syncState(workspaceEditContextId, {
				isEditMode: isEditMode.value,
				selectedCount: selectedCount.value,
			})
		},
		{ throttle: 120, trailing: true },
	)

	const projectsList = computed(() => {
		if (!spaceId.value) return []
		return projectsStore.getProjectsOfSpace(spaceId.value)
	})
	const breadcrumbItems = useWorkspaceProjectBreadcrumb(spaceId, projectId, projectsList)
	provide('workspaceBreadcrumbItems', breadcrumbItems)

	function applyWorkspaceEditCommand(command: WorkspaceEditCommand) {
		switch (command.type) {
			case 'enter-edit-mode':
				enterEditMode()
				return
			case 'exit-edit-mode':
				exitEditMode()
				return
			case 'open-delete-confirm':
				openDeleteConfirm()
				return
			default: {
				const unreachable: never = command.type
				void unreachable
			}
		}
	}

	watch(
		() => workspaceEditStore.pendingCommand,
		(command) => {
			if (!command) return
			if (command.contextId !== workspaceEditContextId) return
			applyWorkspaceEditCommand(command)
			workspaceEditStore.acknowledgeCommand(workspaceEditContextId, command.id)
		},
		{ flush: 'sync' },
	)

	onMounted(() => {
		workspaceEditStore.attachContext(workspaceEditContextId)
		workspaceEditStore.syncState(workspaceEditContextId, {
			isEditMode: isEditMode.value,
			selectedCount: selectedCount.value,
		})
	})

	onBeforeRouteLeave(() => {
		workspaceEditStore.detachContext(workspaceEditContextId)
	})

	onUnmounted(() => {
		workspaceEditStore.detachContext(workspaceEditContextId)
	})

	function onTaskClick(task: WorkspaceTask) {
		if (isEditMode.value) return
		taskInspectorStore.open(task)
	}

	function openProjectSettings() {
		if (!currentProject.value) return
		projectInspectorStore.open(currentProject.value)
	}

	return {
		columnStickyOffset,
		collapseResetKey,
		confirmDelete,
		confirmDeleteOpen,
		closeDeleteConfirm,
		currentProject,
		deleteCount,
		doneAll,
		deleting,
		isEditMode,
		loading,
		onComplete,
		onCreateTaskRequest,
		onTaskClick,
		openProjectSettings,
		projectId,
		requestDeleteTask,
		selectedTaskIds,
		showSpaceLabel,
		taskSpaceId,
		todo,
		toggleColumnSelect,
		toggleTaskSelect,
	}
}
