import type { ProjectDto } from '@/services/api/projects'
import type { TaskDto, TaskStatus } from '@/services/api/tasks'

import { createWorkspaceProjectScopeKey, createWorkspaceTaskScopeKey } from './indexes'
import { useWorkspaceEntitiesStore } from './store'
import {
	mapWorkspaceProjectDtoToEntity,
	mapWorkspaceProjectsDtoToEntities,
	mapWorkspaceTaskDtoToEntity,
	mapWorkspaceTasksDtoToEntities,
	type WorkspaceEntityProject,
	type WorkspaceEntityTask,
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
 * Repository 负责把 transport DTO 与本地写回结果统一落到实体缓存。
 * 所有 workspace 域的写入主路径都应尽量先经过这里，避免页面直接 patch 多份列表快照。
 */
export function useWorkspaceEntityRepository() {
	const store = useWorkspaceEntitiesStore()

	/** 以 space 为单位替换项目快照，并同步该 space 的加载完成标记。 */
	function replaceProjectsForSpace(spaceId: string, projects: ProjectDto[]) {
		store.replaceProjectEntitiesForSpace(spaceId, mapWorkspaceProjectsDtoToEntities(projects))
		store.markProjectSpaceLoaded(spaceId, true)
	}

	function upsertProject(project: ProjectDto) {
		upsertProjectEntity(mapWorkspaceProjectDtoToEntity(project))
	}

	/** 写入单个项目实体，适合创建、标题变更、拖拽排序等局部回写。 */
	function upsertProjectEntity(project: WorkspaceEntityProject) {
		store.upsertProjectEntities([project])
	}

	function upsertProjectEntities(projects: WorkspaceEntityProject[]) {
		store.upsertProjectEntities(projects)
	}

	function removeProjects(projectIds: string[]) {
		store.removeProjectEntities(projectIds)
	}

	/** 任务主加载粒度固定为 space + status，替换时会清掉该 scope 的旧任务。 */
	function replaceTasksForScope(scope: WorkspaceTaskScope, tasks: TaskDto[]) {
		store.replaceTaskEntitiesForScope(scope.spaceId, scope.status, mapWorkspaceTasksDtoToEntities(tasks))
		store.markTaskScopeLoaded(scope.spaceId, scope.status, true)
	}

	function upsertTask(task: TaskDto) {
		upsertTaskEntity(mapWorkspaceTaskDtoToEntity(task))
	}

	/** 写入单个任务实体，供 inspector、创建流、拖拽和完成态切换等链路复用。 */
	function upsertTaskEntity(task: WorkspaceEntityTask) {
		store.upsertTaskEntities([task])
	}

	function upsertTaskEntities(tasks: WorkspaceEntityTask[]) {
		store.upsertTaskEntities(tasks)
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
		upsertProjectEntity,
		upsertProjectEntities,
		removeProjects,
		replaceTasksForScope,
		upsertTask,
		upsertTaskEntity,
		upsertTaskEntities,
		removeTasks,
		setTaskScopeRequestToken,
		getTaskScopeRequestToken,
		setProjectSpaceRequestToken,
		getProjectSpaceRequestToken,
		reset: store.resetWorkspaceEntities,
	}
}
