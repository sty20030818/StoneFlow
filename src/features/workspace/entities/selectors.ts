import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { TaskStatus } from '@/types/domain/task'

import {
	mapWorkspaceProjectDtoToDomain,
	mapWorkspaceTaskDtoToDomain,
	type WorkspaceProject,
	type WorkspaceTask,
} from '../shared/model'
import { createWorkspaceProjectIndexKey } from './indexes'
import { useWorkspaceEntitiesStore } from './store'
import type { WorkspaceEntityProject, WorkspaceEntityTask } from './types'

function mapWorkspaceTaskEntityToView(task: WorkspaceEntityTask): WorkspaceTask {
	return mapWorkspaceTaskDtoToDomain(task)
}

function mapWorkspaceProjectEntityToView(project: WorkspaceEntityProject): WorkspaceProject {
	return mapWorkspaceProjectDtoToDomain(project)
}

export function getWorkspaceProjectEntitiesBySpace(spaceId: string): WorkspaceEntityProject[] {
	const store = useWorkspaceEntitiesStore()
	const projectIds = store.projectIdsBySpace[spaceId] ?? []
	return projectIds
		.map((projectId) => store.projectsById[projectId])
		.filter((project): project is WorkspaceEntityProject => Boolean(project))
}

export function getWorkspaceProjectsBySpaceSnapshot(spaceId: string): WorkspaceProject[] {
	return getWorkspaceProjectEntitiesBySpace(spaceId).map(mapWorkspaceProjectEntityToView)
}

export function getWorkspaceProjectEntityByIdSnapshot(spaceId: string, projectId: string): WorkspaceEntityProject | null {
	const project = getWorkspaceProjectEntitiesBySpace(spaceId).find((item) => item.id === projectId)
	return project ?? null
}

export function getWorkspaceProjectByIdSnapshot(spaceId: string, projectId: string): WorkspaceProject | null {
	const project = getWorkspaceProjectEntityByIdSnapshot(spaceId, projectId)
	return project ? mapWorkspaceProjectEntityToView(project) : null
}

export function getWorkspaceTasksByScopeSnapshot(
	spaceId: string | undefined,
	projectId: string | null | undefined,
	status: TaskStatus,
): WorkspaceTask[] {
	if (!spaceId) return []

	const store = useWorkspaceEntitiesStore()
	const taskIds =
		projectId === null || projectId === undefined
			? (store.taskIdsBySpaceStatus[spaceId]?.[status] ?? [])
			: (store.taskIdsByProjectStatus[createWorkspaceProjectIndexKey(projectId)]?.[status] ?? [])

	return taskIds
		.map((taskId) => store.tasksById[taskId])
		.filter((task): task is WorkspaceEntityTask => Boolean(task) && task.spaceId === spaceId)
		.map(mapWorkspaceTaskEntityToView)
}

export function useWorkspaceProjectsSelector(spaceId: MaybeRefOrGetter<string | undefined>) {
	return computed(() => {
		const currentSpaceId = toValue(spaceId)
		if (!currentSpaceId) return []
		return getWorkspaceProjectsBySpaceSnapshot(currentSpaceId)
	})
}

export function useWorkspaceTaskScopeSelector(
	spaceId: MaybeRefOrGetter<string | undefined>,
	projectId: MaybeRefOrGetter<string | null | undefined>,
	status: MaybeRefOrGetter<TaskStatus>,
) {
	return computed(() => getWorkspaceTasksByScopeSnapshot(toValue(spaceId), toValue(projectId), toValue(status)))
}
