import type { ProjectDto } from '@/services/api/projects'
import type { TaskDto, TaskStatus } from '@/services/api/tasks'

import { createWorkspaceProjectScopeKey, createWorkspaceTaskScopeKey } from './indexes'
import { useWorkspaceEntitiesStore } from './store'
import {
	mapWorkspaceProjectDtoToEntity,
	mapWorkspaceProjectsDtoToEntities,
	mapWorkspaceTaskDtoToEntity,
	mapWorkspaceTasksDtoToEntities,
} from './types'

export type WorkspaceTaskScope = {
	spaceId: string
	status: TaskStatus
}

function createFallbackWorkspaceRequestToken() {
	return `workspace-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createWorkspaceRequestToken() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID()
	}
	return createFallbackWorkspaceRequestToken()
}

/**
 * Repository 负责把 transport DTO 写入实体缓存，后续 query/controller 统一只调这里。
 */
export function useWorkspaceEntityRepository() {
	const store = useWorkspaceEntitiesStore()

	function replaceProjectsForSpace(spaceId: string, projects: ProjectDto[]) {
		store.replaceProjectEntitiesForSpace(spaceId, mapWorkspaceProjectsDtoToEntities(projects))
		store.markProjectSpaceLoaded(spaceId, true)
	}

	function upsertProject(project: ProjectDto) {
		store.upsertProjectEntities([mapWorkspaceProjectDtoToEntity(project)])
	}

	function removeProjects(projectIds: string[]) {
		store.removeProjectEntities(projectIds)
	}

	function replaceTasksForScope(scope: WorkspaceTaskScope, tasks: TaskDto[]) {
		store.replaceTaskEntitiesForScope(scope.spaceId, scope.status, mapWorkspaceTasksDtoToEntities(tasks))
		store.markTaskScopeLoaded(scope.spaceId, scope.status, true)
	}

	function upsertTask(task: TaskDto) {
		store.upsertTaskEntities([mapWorkspaceTaskDtoToEntity(task)])
	}

	function removeTasks(taskIds: string[]) {
		store.removeTaskEntities(taskIds)
	}

	function setTaskScopeRequestToken(scope: WorkspaceTaskScope, token = createWorkspaceRequestToken()) {
		store.setRequestToken(createWorkspaceTaskScopeKey(scope.spaceId, scope.status), token)
		return token
	}

	function getTaskScopeRequestToken(scope: WorkspaceTaskScope) {
		return store.getRequestToken(createWorkspaceTaskScopeKey(scope.spaceId, scope.status))
	}

	function setProjectSpaceRequestToken(spaceId: string, token = createWorkspaceRequestToken()) {
		store.setRequestToken(createWorkspaceProjectScopeKey(spaceId), token)
		return token
	}

	function getProjectSpaceRequestToken(spaceId: string) {
		return store.getRequestToken(createWorkspaceProjectScopeKey(spaceId))
	}

	return {
		replaceProjectsForSpace,
		upsertProject,
		removeProjects,
		replaceTasksForScope,
		upsertTask,
		removeTasks,
		setTaskScopeRequestToken,
		getTaskScopeRequestToken,
		setProjectSpaceRequestToken,
		getProjectSpaceRequestToken,
		reset: store.resetWorkspaceEntities,
	}
}
