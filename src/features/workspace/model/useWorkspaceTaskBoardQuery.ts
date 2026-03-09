import { useQuery } from '@pinia/colada'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import { listWorkspaceTasks, type ListWorkspaceTasksArgs } from '../queries'
import type { WorkspaceTask } from './types'

import { workspaceQueryKeys, type WorkspaceTaskListScope } from './query-keys'

function normalizeScope(spaceId?: string, projectId?: string | null): Omit<WorkspaceTaskListScope, 'status'> {
	return {
		spaceId: spaceId ?? null,
		projectId: projectId ?? null,
	}
}

function toTaskListArgs(scope: WorkspaceTaskListScope): ListWorkspaceTasksArgs {
	const args: ListWorkspaceTasksArgs = {
		status: scope.status,
	}
	if (scope.spaceId) args.spaceId = scope.spaceId
	if (scope.projectId !== null) args.projectId = scope.projectId
	return args
}

export function useWorkspaceTaskBoardQuery(
	spaceId?: MaybeRefOrGetter<string | undefined>,
	projectId?: MaybeRefOrGetter<string | null | undefined>,
) {
	const baseScope = computed(() => normalizeScope(toValue(spaceId), toValue(projectId)))
	const todoScope = computed<WorkspaceTaskListScope>(() => ({
		...baseScope.value,
		status: 'todo',
	}))
	const doneScope = computed<WorkspaceTaskListScope>(() => ({
		...baseScope.value,
		status: 'done',
	}))

	const todoQuery = useQuery<WorkspaceTask[]>({
		key: () => workspaceQueryKeys.tasks.list(todoScope.value),
		query: async () => {
			return await listWorkspaceTasks(toTaskListArgs(todoScope.value))
		},
		placeholderData: (previousData) => previousData,
	})

	const doneQuery = useQuery<WorkspaceTask[]>({
		key: () => workspaceQueryKeys.tasks.list(doneScope.value),
		query: async () => {
			return await listWorkspaceTasks(toTaskListArgs(doneScope.value))
		},
		placeholderData: (previousData) => previousData,
	})

	const loading = computed(() => todoQuery.isLoading.value || doneQuery.isLoading.value)
	const todo = computed(() => todoQuery.data.value ?? [])
	const doneAll = computed(() => doneQuery.data.value ?? [])

	async function refresh() {
		await Promise.all([todoQuery.refetch(), doneQuery.refetch()])
	}

	return {
		todo,
		doneAll,
		loading,
		todoError: computed(() => todoQuery.error.value),
		doneError: computed(() => doneQuery.error.value),
		refresh,
	}
}
