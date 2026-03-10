import { useQuery } from '@pinia/colada'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import { useStoneFlowQueryCache } from '@/features/shared'
import { listWorkspaceTasks, type ListWorkspaceTasksArgs } from '../../tasks/queries'
import { workspaceQueryKeys, type WorkspaceTask, type WorkspaceTaskListScope } from '../model'

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

function isTaskVisibleInScope(task: WorkspaceTask, scope: WorkspaceTaskListScope): boolean {
	if (task.archivedAt !== null || task.deletedAt !== null) return false
	if (task.status !== scope.status) return false
	if (scope.spaceId !== null && task.spaceId !== scope.spaceId) return false
	if (scope.projectId !== null && task.projectId !== scope.projectId) return false
	return true
}

function sortTasksForScope(tasks: WorkspaceTask[], scope: WorkspaceTaskListScope): WorkspaceTask[] {
	if (scope.status === 'done') {
		return [...tasks].sort((left, right) => (right.completedAt ?? 0) - (left.completedAt ?? 0))
	}

	return [...tasks].sort((left, right) => left.rank - right.rank)
}

export function patchWorkspaceTaskSnapshot(previousTask: WorkspaceTask, nextTask: WorkspaceTask) {
	const queryCache = useStoneFlowQueryCache()
	const entries = queryCache.getEntries({
		key: ['workspace', 'tasks', 'list'],
	})

	for (const entry of entries) {
		if (!workspaceQueryKeys.tasks.isListKey(entry.key)) continue
		const scope = entry.key[3]

		queryCache.setQueryData<WorkspaceTask[]>(entry.key, (oldData) => {
			const currentList = oldData ?? []
			const existingIndex = currentList.findIndex((task) => task.id === previousTask.id)
			const shouldShowNextTask = isTaskVisibleInScope(nextTask, scope)

			if (existingIndex < 0 && !shouldShowNextTask) return currentList

			const nextList = [...currentList]
			if (existingIndex >= 0) {
				if (shouldShowNextTask) {
					nextList.splice(existingIndex, 1, nextTask)
				} else {
					nextList.splice(existingIndex, 1)
				}
			} else if (shouldShowNextTask) {
				nextList.push(nextTask)
			}

			return sortTasksForScope(nextList, scope)
		})
	}
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

	const loading = computed(() => {
		const todoInitialLoading = todoQuery.isLoading.value && todoQuery.data.value === undefined
		const doneInitialLoading = doneQuery.isLoading.value && doneQuery.data.value === undefined
		return todoInitialLoading || doneInitialLoading
	})
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
