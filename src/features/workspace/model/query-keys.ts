import type { QueryKey } from '@tanstack/vue-query'

import { createQueryKey } from '@/features/shared'
import type { TaskStatus } from '@/types/domain/task'

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

function isWorkspaceTaskQueryKey(queryKey: QueryKey): boolean {
	return queryKey[0] === 'workspace' && queryKey[1] === 'tasks'
}

function isWorkspaceProjectQueryKey(queryKey: QueryKey): boolean {
	return queryKey[0] === 'workspace' && queryKey[1] === 'projects'
}

function isWorkspaceProjectListQueryKey(
	queryKey: QueryKey,
): queryKey is readonly ['workspace', 'projects', 'list', WorkspaceProjectListScope] {
	if (queryKey.length !== 4) return false
	if (queryKey[0] !== 'workspace' || queryKey[1] !== 'projects' || queryKey[2] !== 'list') return false
	const scope = queryKey[3]
	if (!scope || typeof scope !== 'object') return false
	return typeof (scope as WorkspaceProjectListScope).spaceId === 'string'
}

export const workspaceQueryKeys = {
	tasks: {
		list: (scope: WorkspaceTaskListScope) =>
			createQueryKey('workspace', 'tasks', 'list', normalizeWorkspaceTaskScope(scope)),
		isMatch: isWorkspaceTaskQueryKey,
	},
	projects: {
		list: (scope: WorkspaceProjectListScope) =>
			createQueryKey('workspace', 'projects', 'list', normalizeWorkspaceProjectScope(scope)),
		isMatch: isWorkspaceProjectQueryKey,
		isListKey: isWorkspaceProjectListQueryKey,
	},
} as const
