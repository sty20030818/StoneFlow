import { useQuery } from '@pinia/colada'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import { listTasks } from '@/services/api/tasks'
import { useStoneFlowQueryCache } from '@/features/shared'
import { useWorkspaceEntityRepository } from '../../entities/repository'
import { useWorkspaceTaskScopeSelector } from '../../entities/selectors'
import { useWorkspaceEntitiesStore } from '../../entities/store'
import { createWorkspaceTaskScopeKey } from '../../entities/indexes'
import { workspaceQueryKeys, type WorkspaceTask, type WorkspaceTaskListScope } from '../model'

function createTransportScope(
	spaceId: string | undefined,
	status: WorkspaceTaskListScope['status'],
): WorkspaceTaskListScope {
	return {
		spaceId: spaceId ?? null,
		projectId: null,
		status,
	}
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
	const repository = useWorkspaceEntityRepository()
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

	repository.upsertTask(nextTask)
}

export function useWorkspaceTaskBoardQuery(
	spaceId?: MaybeRefOrGetter<string | undefined>,
	projectId?: MaybeRefOrGetter<string | null | undefined>,
) {
	const repository = useWorkspaceEntityRepository()
	const entityStore = useWorkspaceEntitiesStore()
	const activeSpaceId = computed(() => toValue(spaceId))
	const activeProjectId = computed(() => toValue(projectId) ?? null)
	const todoStatus = computed(() => 'todo' as const)
	const doneStatus = computed(() => 'done' as const)
	const todoScope = computed(() => createTransportScope(activeSpaceId.value, 'todo'))
	const doneScope = computed(() => createTransportScope(activeSpaceId.value, 'done'))

	const todoQuery = useQuery<number>({
		key: () => workspaceQueryKeys.tasks.list(todoScope.value),
		enabled: () => Boolean(activeSpaceId.value),
		query: async () => {
			const currentSpaceId = activeSpaceId.value
			if (!currentSpaceId) return 0
			const tasks = await listTasks({ spaceId: currentSpaceId, status: 'todo' })
			repository.replaceTasksForScope({ spaceId: currentSpaceId, status: 'todo' }, tasks)
			return tasks.length
		},
	})

	const doneQuery = useQuery<number>({
		key: () => workspaceQueryKeys.tasks.list(doneScope.value),
		enabled: () => Boolean(activeSpaceId.value),
		query: async () => {
			const currentSpaceId = activeSpaceId.value
			if (!currentSpaceId) return 0
			const tasks = await listTasks({ spaceId: currentSpaceId, status: 'done' })
			repository.replaceTasksForScope({ spaceId: currentSpaceId, status: 'done' }, tasks)
			return tasks.length
		},
	})

	const todo = useWorkspaceTaskScopeSelector(activeSpaceId, activeProjectId, todoStatus)
	const doneAll = useWorkspaceTaskScopeSelector(activeSpaceId, activeProjectId, doneStatus)
	const loading = computed(() => {
		const currentSpaceId = activeSpaceId.value
		if (!currentSpaceId) return false
		const todoLoaded = Boolean(entityStore.loadedTaskScopes[createWorkspaceTaskScopeKey(currentSpaceId, 'todo')])
		const doneLoaded = Boolean(entityStore.loadedTaskScopes[createWorkspaceTaskScopeKey(currentSpaceId, 'done')])
		const todoInitialLoading = !todoLoaded && todoQuery.isLoading.value
		const doneInitialLoading = !doneLoaded && doneQuery.isLoading.value
		return todoInitialLoading || doneInitialLoading
	})

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
