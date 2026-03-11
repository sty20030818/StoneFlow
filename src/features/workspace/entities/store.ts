import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TaskStatus } from '@/services/api/tasks'

import {
	createEmptyWorkspaceTaskIdsByStatus,
	createWorkspaceProjectIndexKey,
	createWorkspaceProjectScopeKey,
	createWorkspaceTaskScopeKey,
	type WorkspaceLoadedProjectSpaces,
	type WorkspaceLoadedTaskScopes,
	type WorkspaceProjectIdsBySpace,
	type WorkspaceRequestTokens,
	type WorkspaceTaskIdsByProjectStatus,
	type WorkspaceTaskIdsBySpaceStatus,
} from './indexes'
import { isWorkspaceDefaultProject, type WorkspaceEntityProject, type WorkspaceEntityTask } from './types'

function isWorkspaceActiveTask(task: WorkspaceEntityTask): boolean {
	return task.archivedAt === null && task.deletedAt === null
}

function isWorkspaceActiveProject(project: WorkspaceEntityProject): boolean {
	return project.archivedAt === null && project.deletedAt === null
}

function compareWorkspaceTasks(left: WorkspaceEntityTask, right: WorkspaceEntityTask): number {
	if (left.status === 'done' && right.status === 'done') {
		return (right.completedAt ?? 0) - (left.completedAt ?? 0)
	}
	return left.rank - right.rank
}

function compareWorkspaceProjects(left: WorkspaceEntityProject, right: WorkspaceEntityProject): number {
	if (left.rank !== right.rank) return left.rank - right.rank
	return left.title.localeCompare(right.title, 'zh-CN')
}

/**
 * 统一从实体字典重建索引，优先保证正确性，后续再按热点路径优化为增量维护。
 */
function rebuildTaskIndexes(tasksById: Record<string, WorkspaceEntityTask>) {
	const taskIdsBySpaceStatus: WorkspaceTaskIdsBySpaceStatus = {}
	const taskIdsByProjectStatus: WorkspaceTaskIdsByProjectStatus = {}
	const activeTasks = Object.values(tasksById).filter(isWorkspaceActiveTask).sort(compareWorkspaceTasks)

	for (const task of activeTasks) {
		const spaceBuckets = taskIdsBySpaceStatus[task.spaceId] ?? createEmptyWorkspaceTaskIdsByStatus()
		spaceBuckets[task.status].push(task.id)
		taskIdsBySpaceStatus[task.spaceId] = spaceBuckets

		const projectIndexKey = createWorkspaceProjectIndexKey(task.projectId)
		const projectBuckets = taskIdsByProjectStatus[projectIndexKey] ?? createEmptyWorkspaceTaskIdsByStatus()
		projectBuckets[task.status].push(task.id)
		taskIdsByProjectStatus[projectIndexKey] = projectBuckets
	}

	return {
		taskIdsBySpaceStatus,
		taskIdsByProjectStatus,
	}
}

function rebuildProjectIndexes(projectsById: Record<string, WorkspaceEntityProject>) {
	const projectIdsBySpace: WorkspaceProjectIdsBySpace = {}
	const defaultProjectIdBySpace: Record<string, string> = {}
	const activeProjects = Object.values(projectsById).filter(isWorkspaceActiveProject).sort(compareWorkspaceProjects)

	for (const project of activeProjects) {
		const currentProjectIds = projectIdsBySpace[project.spaceId] ?? []
		currentProjectIds.push(project.id)
		projectIdsBySpace[project.spaceId] = currentProjectIds

		if (isWorkspaceDefaultProject(project.id)) {
			defaultProjectIdBySpace[project.spaceId] = project.id
		}
	}

	return {
		projectIdsBySpace,
		defaultProjectIdBySpace,
	}
}

export const useWorkspaceEntitiesStore = defineStore('workspace-entities', () => {
	const tasksById = ref<Record<string, WorkspaceEntityTask>>({})
	const projectsById = ref<Record<string, WorkspaceEntityProject>>({})
	const projectIdsBySpace = ref<WorkspaceProjectIdsBySpace>({})
	const taskIdsBySpaceStatus = ref<WorkspaceTaskIdsBySpaceStatus>({})
	const taskIdsByProjectStatus = ref<WorkspaceTaskIdsByProjectStatus>({})
	const defaultProjectIdBySpace = ref<Record<string, string>>({})
	const loadedTaskScopes = ref<WorkspaceLoadedTaskScopes>({})
	const loadedProjectSpaces = ref<WorkspaceLoadedProjectSpaces>({})
	const requestTokens = ref<WorkspaceRequestTokens>({})

	function syncTaskIndexes() {
		const nextIndexes = rebuildTaskIndexes(tasksById.value)
		taskIdsBySpaceStatus.value = nextIndexes.taskIdsBySpaceStatus
		taskIdsByProjectStatus.value = nextIndexes.taskIdsByProjectStatus
	}

	function syncProjectIndexes() {
		const nextIndexes = rebuildProjectIndexes(projectsById.value)
		projectIdsBySpace.value = nextIndexes.projectIdsBySpace
		defaultProjectIdBySpace.value = nextIndexes.defaultProjectIdBySpace
	}

	function upsertTaskEntities(tasks: WorkspaceEntityTask[]) {
		if (tasks.length === 0) return
		tasksById.value = {
			...tasksById.value,
			...Object.fromEntries(tasks.map((task) => [task.id, task])),
		}
		syncTaskIndexes()
	}

	function replaceTaskEntitiesForScope(spaceId: string, status: TaskStatus, tasks: WorkspaceEntityTask[]) {
		const nextTasksById: Record<string, WorkspaceEntityTask> = {}
		for (const [taskId, task] of Object.entries(tasksById.value)) {
			if (task.spaceId === spaceId && task.status === status) continue
			nextTasksById[taskId] = task
		}
		for (const task of tasks) {
			nextTasksById[task.id] = task
		}
		tasksById.value = nextTasksById
		syncTaskIndexes()
	}

	function removeTaskEntities(taskIds: string[]) {
		if (taskIds.length === 0) return
		const targetIds = new Set(taskIds)
		tasksById.value = Object.fromEntries(
			Object.entries(tasksById.value).filter(([taskId]) => !targetIds.has(taskId)),
		)
		syncTaskIndexes()
	}

	function upsertProjectEntities(projects: WorkspaceEntityProject[]) {
		if (projects.length === 0) return
		projectsById.value = {
			...projectsById.value,
			...Object.fromEntries(projects.map((project) => [project.id, project])),
		}
		syncProjectIndexes()
	}

	function replaceProjectEntitiesForSpace(spaceId: string, projects: WorkspaceEntityProject[]) {
		const nextProjectsById: Record<string, WorkspaceEntityProject> = {}
		for (const [projectId, project] of Object.entries(projectsById.value)) {
			if (project.spaceId === spaceId) continue
			nextProjectsById[projectId] = project
		}
		for (const project of projects) {
			nextProjectsById[project.id] = project
		}
		projectsById.value = nextProjectsById
		syncProjectIndexes()
	}

	function removeProjectEntities(projectIds: string[]) {
		if (projectIds.length === 0) return
		const targetIds = new Set(projectIds)
		projectsById.value = Object.fromEntries(
			Object.entries(projectsById.value).filter(([projectId]) => !targetIds.has(projectId)),
		)
		syncProjectIndexes()
	}

	function markTaskScopeLoaded(spaceId: string, status: TaskStatus, loaded = true) {
		loadedTaskScopes.value = {
			...loadedTaskScopes.value,
			[createWorkspaceTaskScopeKey(spaceId, status)]: loaded,
		}
	}

	function markProjectSpaceLoaded(spaceId: string, loaded = true) {
		loadedProjectSpaces.value = {
			...loadedProjectSpaces.value,
			[spaceId]: loaded,
		}
	}

	function setRequestToken(scopeKey: string, token: string) {
		requestTokens.value = {
			...requestTokens.value,
			[scopeKey]: token,
		}
	}

	function getRequestToken(scopeKey: string): string | null {
		return requestTokens.value[scopeKey] ?? null
	}

	function clearRequestToken(scopeKey: string) {
		const { [scopeKey]: _, ...rest } = requestTokens.value
		requestTokens.value = rest
	}

	function resetWorkspaceEntities() {
		tasksById.value = {}
		projectsById.value = {}
		projectIdsBySpace.value = {}
		taskIdsBySpaceStatus.value = {}
		taskIdsByProjectStatus.value = {}
		defaultProjectIdBySpace.value = {}
		loadedTaskScopes.value = {}
		loadedProjectSpaces.value = {}
		requestTokens.value = {}
	}

	return {
		tasksById,
		projectsById,
		projectIdsBySpace,
		taskIdsBySpaceStatus,
		taskIdsByProjectStatus,
		defaultProjectIdBySpace,
		loadedTaskScopes,
		loadedProjectSpaces,
		requestTokens,
		upsertTaskEntities,
		replaceTaskEntitiesForScope,
		removeTaskEntities,
		upsertProjectEntities,
		replaceProjectEntitiesForSpace,
		removeProjectEntities,
		markTaskScopeLoaded,
		markProjectSpaceLoaded,
		setRequestToken,
		getRequestToken,
		clearRequestToken,
		resetWorkspaceEntities,
		createWorkspaceTaskScopeKey,
		createWorkspaceProjectScopeKey,
	}
})
