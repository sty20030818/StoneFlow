import { createQueryKey } from '@/features/shared'
import type { TaskStatus } from '@/types/domain/task'

type QueryKeyLike = readonly unknown[]

export type WorkspaceTaskListScope = {
	spaceId: string | null
	projectId: string | null
	status: TaskStatus
}

export type WorkspaceProjectListScope = {
	spaceId: string
}

function normalizeWorkspaceTaskScope(scope: WorkspaceTaskListScope): WorkspaceTaskListScope {
	return {
		spaceId: scope.spaceId ?? null,
		projectId: scope.projectId ?? null,
		status: scope.status,
	}
}

function normalizeWorkspaceProjectScope(scope: WorkspaceProjectListScope): WorkspaceProjectListScope {
	return {
		spaceId: scope.spaceId,
	}
}

function isWorkspaceTaskQueryKey(queryKey: QueryKeyLike): boolean {
	return queryKey[0] === 'workspace' && queryKey[1] === 'tasks'
}

function isWorkspaceProjectQueryKey(queryKey: QueryKeyLike): boolean {
	return queryKey[0] === 'workspace' && queryKey[1] === 'projects'
}

function isWorkspaceProjectListQueryKey(
	queryKey: QueryKeyLike,
): queryKey is readonly ['workspace', 'projects', 'list', WorkspaceProjectListScope] {
	if (queryKey.length !== 4) return false
	if (queryKey[0] !== 'workspace' || queryKey[1] !== 'projects' || queryKey[2] !== 'list') return false
	const scope = queryKey[3]
	if (!scope || typeof scope !== 'object') return false
	return typeof (scope as WorkspaceProjectListScope).spaceId === 'string'
}

function isWorkspaceTaskListQueryKey(
	queryKey: QueryKeyLike,
): queryKey is readonly ['workspace', 'tasks', 'list', WorkspaceTaskListScope] {
	if (queryKey.length !== 4) return false
	if (queryKey[0] !== 'workspace' || queryKey[1] !== 'tasks' || queryKey[2] !== 'list') return false
	const scope = queryKey[3]
	if (!scope || typeof scope !== 'object') return false
	const taskScope = scope as WorkspaceTaskListScope
	const hasSpaceId = taskScope.spaceId === null || typeof taskScope.spaceId === 'string'
	const hasProjectId = taskScope.projectId === null || typeof taskScope.projectId === 'string'
	return hasSpaceId && hasProjectId && typeof taskScope.status === 'string'
}

export const workspaceQueryKeys = {
	tasks: {
		list: (scope: WorkspaceTaskListScope) =>
			createQueryKey('workspace', 'tasks', 'list', normalizeWorkspaceTaskScope(scope)),
		isMatch: isWorkspaceTaskQueryKey,
		isListKey: isWorkspaceTaskListQueryKey,
	},
	projects: {
		list: (scope: WorkspaceProjectListScope) =>
			createQueryKey('workspace', 'projects', 'list', normalizeWorkspaceProjectScope(scope)),
		isMatch: isWorkspaceProjectQueryKey,
		isListKey: isWorkspaceProjectListQueryKey,
	},
} as const
