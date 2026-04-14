import { useI18n } from 'vue-i18n'
import { watchDebounced, watchThrottled } from '@vueuse/core'
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'

import { useRegisterAppHeader } from '@/app/layout/header'
import { OPEN_CREATE_TASK_MODAL_KEY } from '@/app/injection-keys'
import { useNullableStringRouteQuery } from '@/shared/composables/base/route-query'
import { findDefaultProject, getDefaultProjectId, isDefaultProjectId } from '@/shared/config/project'
import { useProjectInspectorStore, useTaskInspectorStore } from '@/features/inspector/store'
import { useSettingsStore } from '@/app/stores/settings'
import { useWorkspaceEditStore, type WorkspaceEditCommand } from '@/features/workspace/project-view/store/workspace-edit'
import { resolveErrorMessage } from '@/shared/lib/error-message'
import type { WorkspaceTask } from '../shared/model'
import { refreshWorkspaceProjectsQuery } from '../shared/queries'
import { useWorkspaceEntityRepository } from '../entities/repository'
import { useSpaceProjectsState } from '../spaces'
import { deleteWorkspaceTasks } from '../task-board'
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
	const settingsStore = useSettingsStore()
	const workspaceEditStore = useWorkspaceEditStore()
	const projectInspectorStore = useProjectInspectorStore()
	const taskInspectorStore = useTaskInspectorStore()
	const openCreateTaskModal = inject(OPEN_CREATE_TASK_MODAL_KEY)
	const toast = useToast()
	const workspaceRepository = useWorkspaceEntityRepository()
	const workspaceEditContextId = createWorkspaceEditContextId()

	const spaceId = computed(() => {
		const value = route.params.spaceId
		return typeof value === 'string' ? value : undefined
	})
	const taskSpaceId = computed(() => {
		if (route.path === '/all-tasks') return settingsStore.settings.activeSpaceId
		return spaceId.value
	})
	const showSpaceLabel = computed(() => !spaceId.value)
	const projectsState = useSpaceProjectsState(
		computed(() => spaceId.value ?? 'work'),
		{
			enabled: computed(() => Boolean(spaceId.value)),
		},
	)

	// 页面真正消费的是 resolved project scope，而不是路由上暂时残留的 raw query。
	const resolvedProjectId = computed(() => {
		const currentSpaceId = spaceId.value
		const currentRouteProjectId = routeProjectId.value
		if (!currentRouteProjectId || !currentSpaceId) return currentRouteProjectId ?? null
		if (!projectsState.isLoaded.value) return currentRouteProjectId
		const projects = projectsState.projects.value
		if (projects.some((project) => project.id === currentRouteProjectId)) return currentRouteProjectId
		if (isDefaultProjectId(currentRouteProjectId)) {
			return findDefaultProject(projects)?.id ?? getDefaultProjectId(currentSpaceId)
		}
		return null
	})
	const projectId = computed(() => resolvedProjectId.value)
	const collapseResetKey = computed(() => `${route.path}|${spaceId.value ?? 'all'}|${projectId.value ?? 'none'}`)

	const {
		loading: taskBoardLoading,
		todo,
		doneAll,
		loadErrorMessage,
		showLoadErrorState: taskBoardLoadErrorState,
		refresh,
		onComplete,
	} = useWorkspaceProjectTasks(taskSpaceId, projectId)

	const isEditMode = ref(false)
	const confirmDeleteOpen = ref(false)
	const deleting = ref(false)
	const selectedTaskIds = ref<Set<string>>(new Set())
	const deleteTargetIds = ref<string[] | null>(null)
	const columnStickyOffset = computed(() => (isEditMode.value ? 48 : 0))

	const selectedCount = computed(() => selectedTaskIds.value.size)
	const deleteCount = computed(() => deleteTargetIds.value?.length ?? selectedCount.value)
	const isProjectRouteResolving = computed(() => {
		const currentSpaceId = spaceId.value
		const currentRouteProjectId = routeProjectId.value
		if (!currentSpaceId || !currentRouteProjectId) return false
		if (!projectsState.isLoaded.value) return true
		return resolvedProjectId.value !== currentRouteProjectId
	})
	const loading = computed(() => taskBoardLoading.value || isProjectRouteResolving.value)
	const showLoadErrorState = computed(() => !isProjectRouteResolving.value && taskBoardLoadErrorState.value)

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
			const affectedSpaceIds = new Set(
				[...todo.value, ...doneAll.value].filter((task) => ids.includes(task.id)).map((task) => task.spaceId),
			)
			const deletedCount = await deleteWorkspaceTasks(ids)
			workspaceRepository.removeTasks(ids)
			await Promise.all(
				[...affectedSpaceIds].map((currentSpaceId) => refreshWorkspaceProjectsQuery(currentSpaceId, { force: true })),
			)
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
		return projectsState.projects.value.find((project) => project.id === currentProjectId) ?? null
	})

	// 页面渲染只认 resolved scope；当路由上的 project query 对当前 space 无效时，
	// 先保持安全 loading，再将 query 纠正到当前 space 下的真实 project 或 all tasks。
	watch(
		() => [spaceId.value, routeProjectId.value, projectsState.isLoaded.value, resolvedProjectId.value] as const,
		([currentSpaceId, currentRouteProjectId, isProjectsLoaded, nextResolvedProjectId]) => {
			if (!currentSpaceId || !isProjectsLoaded) return
			if ((currentRouteProjectId ?? null) === nextResolvedProjectId) return
			routeProjectId.value = nextResolvedProjectId
		},
		{ immediate: true },
	)

	watchDebounced(
		() => [route.params.spaceId, routeProjectId.value],
		() => {
			exitEditMode()
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

	const projectsList = computed(() => projectsState.projects.value)
	const projectBreadcrumbItems = useWorkspaceProjectBreadcrumb(spaceId, projectId, projectsList)
	const breadcrumbItems = computed(() => {
		if (projectBreadcrumbItems.value.length > 0) return projectBreadcrumbItems.value
		if (route.path !== '/all-tasks') return []
		return [
			{
				label: t('nav.pages.allTasks.title'),
				description: t('nav.pages.allTasks.description'),
				icon: typeof route.meta.icon === 'string' ? route.meta.icon : undefined,
			},
		]
	})
	useRegisterAppHeader(
		computed(() => ({
			breadcrumb: breadcrumbItems.value,
		})),
		'workspace-project-view',
	)

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
		loadErrorMessage,
		loading,
		onComplete,
		onCreateTaskRequest,
		onTaskClick,
		openProjectSettings,
		projectId,
		refresh,
		requestDeleteTask,
		selectedTaskIds,
		showSpaceLabel,
		showLoadErrorState,
		taskSpaceId,
		todo,
		toggleColumnSelect,
		toggleTaskSelect,
	}
}
