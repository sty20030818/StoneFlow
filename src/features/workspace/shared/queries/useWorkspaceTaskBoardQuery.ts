import { useQuery } from '@pinia/colada'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import { listTasks, type TaskStatus } from '@/services/api/tasks'
import { useStoneFlowQueryCache } from '@/features/shared'
import { useWorkspaceEntityRepository } from '../../entities/repository'
import { createWorkspaceTaskScopeKey } from '../../entities/indexes'
import { useWorkspaceTaskScopeSelector } from '../../entities/selectors'
import { useWorkspaceEntitiesStore } from '../../entities/store'
import { workspaceQueryKeys, type WorkspaceTask, type WorkspaceTaskListScope } from '../model'

export type WorkspaceTaskTransportStatus = Extract<TaskStatus, 'todo' | 'done'>

const TASKS_QUERY_STALE_TIME = 60 * 1000
const TASKS_QUERY_GC_TIME = 10 * 60 * 1000

function createTransportScope(
	spaceId: string | undefined,
	status: WorkspaceTaskTransportStatus,
): WorkspaceTaskListScope {
	return {
		spaceId: spaceId ?? null,
		projectId: null,
		status,
	}
}

/**
 * 任务 query 的 transport 主键已经收敛到 space + status。
 * 页面层不再以 projectId 作为请求粒度，而是先整批入库，再由 selector 做 project 级投影。
 */
function createTaskTransportQueryOptions(
	spaceId: string,
	status: WorkspaceTaskTransportStatus,
	repository: ReturnType<typeof useWorkspaceEntityRepository>,
) {
	return {
		key: workspaceQueryKeys.tasks.list(createTransportScope(spaceId, status)),
		query: async () => {
			const tasks = await listTasks({ spaceId, status })
			repository.replaceTasksForScope({ spaceId, status }, tasks)
			return tasks.length
		},
		enabled: true,
		staleTime: TASKS_QUERY_STALE_TIME,
		gcTime: TASKS_QUERY_GC_TIME,
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
		refetchOnMount: true,
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

/**
 * 旧调用链兼容桥：少量历史入口仍会依赖 query cache 的当前列表数据。
 * 新链路应优先直接写 repository，并在必要时定向 refresh 对应的 transport scope。
 */
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

/**
 * 对外暴露的定向刷新 helper。
 * 供删除项目、拖拽重排、结构性变更后，按 space 精准回拉 todo / done 双状态任务。
 */
export async function refreshWorkspaceTaskScopes(
	spaceId: string,
	options: {
		force?: boolean
		statuses?: WorkspaceTaskTransportStatus[]
	} = {},
) {
	const queryCache = useStoneFlowQueryCache()
	const repository = useWorkspaceEntityRepository()
	const statuses = options.statuses ?? ['todo', 'done']

	await Promise.all(
		statuses.map(async (status) => {
			const queryOptions = createTaskTransportQueryOptions(spaceId, status, repository)
			const entry = queryCache.ensure(queryOptions)

			if (options.force) {
				await queryCache.fetch(entry, queryOptions)
				return
			}

			await queryCache.refresh(entry, queryOptions)
		}),
	)
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
		staleTime: TASKS_QUERY_STALE_TIME,
		gcTime: TASKS_QUERY_GC_TIME,
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
		refetchOnMount: true,
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
		staleTime: TASKS_QUERY_STALE_TIME,
		gcTime: TASKS_QUERY_GC_TIME,
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
		refetchOnMount: true,
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
