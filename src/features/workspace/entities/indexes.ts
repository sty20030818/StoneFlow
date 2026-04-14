import type { TaskStatus } from '@/infra/api/tasks'

export const WORKSPACE_UNASSIGNED_PROJECT_INDEX_KEY = '__workspace_unassigned_project__'

export type WorkspaceTaskIdsByStatus = Record<TaskStatus, string[]>
export type WorkspaceProjectIdsBySpace = Record<string, string[]>
export type WorkspaceTaskIdsBySpaceStatus = Record<string, WorkspaceTaskIdsByStatus>
export type WorkspaceTaskIdsByProjectStatus = Record<string, WorkspaceTaskIdsByStatus>
export type WorkspaceLoadedTaskScopes = Record<string, boolean>
export type WorkspaceLoadedProjectSpaces = Record<string, boolean>
export type WorkspaceRequestTokens = Record<string, string>

export function createEmptyWorkspaceTaskIdsByStatus(): WorkspaceTaskIdsByStatus {
	return {
		todo: [],
		done: [],
	}
}

export function createWorkspaceTaskScopeKey(spaceId: string, status: TaskStatus): string {
	return `${spaceId}::${status}`
}

export function createWorkspaceProjectScopeKey(spaceId: string): string {
	return `projects::${spaceId}`
}

export function createWorkspaceProjectIndexKey(projectId: string | null): string {
	return projectId ?? WORKSPACE_UNASSIGNED_PROJECT_INDEX_KEY
}
