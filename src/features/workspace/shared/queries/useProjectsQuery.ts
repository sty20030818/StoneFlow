import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'

import { listProjects } from '@/services/api/projects'
import { useStoneFlowQueryCache } from '@/features/shared'
import { useWorkspaceEntityRepository } from '../../entities/repository'
import {
	getWorkspaceProjectByIdSnapshot,
	getWorkspaceProjectEntityByIdSnapshot,
	getWorkspaceProjectsBySpaceSnapshot,
} from '../../entities/selectors'
import { workspaceQueryKeys, type WorkspaceProjectListScope, type WorkspaceProject } from '../model'

export const PROJECTS_QUERY_STALE_TIME = 5 * 60 * 1000
export const PROJECTS_QUERY_GC_TIME = 10 * 60 * 1000

export type UseProjectsQueryOptions = {
	spaceId: MaybeRefOrGetter<string>
	enabled?: MaybeRefOrGetter<boolean>
	staleTime?: number
}

function createProjectsScope(spaceId: string): WorkspaceProjectListScope {
	return { spaceId }
}

/**
 * 项目 query 的职责只剩 transport：
 * - 请求远端/本地 API
 * - 把结果落到 repository
 * - 把 selector 当前快照返回给 query 订阅方用于加载态联动
 */
function createProjectsListQueryOptions(
	spaceId: string,
	repository: ReturnType<typeof useWorkspaceEntityRepository>,
	staleTime = PROJECTS_QUERY_STALE_TIME,
) {
	return {
		key: workspaceQueryKeys.projects.list(createProjectsScope(spaceId)),
		query: async () => {
			const projects = await listProjects({ spaceId })
			repository.replaceProjectsForSpace(spaceId, projects)
			return getWorkspaceProjectsBySpaceSnapshot(spaceId)
		},
		enabled: true,
		staleTime,
		gcTime: PROJECTS_QUERY_GC_TIME,
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
		refetchOnMount: true,
	}
}

export function useProjectsQuery(options: UseProjectsQueryOptions) {
	const repository = useWorkspaceEntityRepository()
	return useQuery(() => ({
		...createProjectsListQueryOptions(toValue(options.spaceId), repository, options.staleTime),
		enabled: toValue(options.enabled) ?? true,
	}))
}

export function getWorkspaceProjectsSnapshot(spaceId: string): WorkspaceProject[] {
	return getWorkspaceProjectsBySpaceSnapshot(spaceId)
}

export function getWorkspaceProjectById(spaceId: string, projectId: string): WorkspaceProject | null {
	return getWorkspaceProjectByIdSnapshot(spaceId, projectId)
}

/**
 * 旧调用链的兼容桥：目前仍保留给少量历史入口使用。
 * 新链路应优先直接写 repository，而不是继续扩散这个 snapshot patch helper。
 */
export function patchWorkspaceProjectSnapshot(spaceId: string, projectId: string, patch: Partial<WorkspaceProject>) {
	const queryCache = useStoneFlowQueryCache()
	const repository = useWorkspaceEntityRepository()
	const currentProject = getWorkspaceProjectEntityByIdSnapshot(spaceId, projectId)

	if (currentProject) {
		repository.upsertProject({
			...currentProject,
			...patch,
		})
	}

	queryCache.setQueryData<WorkspaceProject[]>(
		workspaceQueryKeys.projects.list(createProjectsScope(spaceId)),
		(oldData: WorkspaceProject[] | undefined) => {
			if (!oldData?.length) return oldData ?? []
			return oldData.map((project: WorkspaceProject) => {
				if (project.id !== projectId) return project
				return {
					...project,
					...patch,
				}
			})
		},
	)
}

export async function refreshWorkspaceProjectsQuery(spaceId: string, options: { force?: boolean } = {}) {
	const queryCache = useStoneFlowQueryCache()
	const repository = useWorkspaceEntityRepository()
	const queryOptions = createProjectsListQueryOptions(spaceId, repository)
	const entry = queryCache.ensure(queryOptions)

	if (options.force) {
		return await queryCache.fetch(entry, queryOptions)
	}

	return await queryCache.refresh(entry, queryOptions)
}

export async function warmupWorkspaceProjectsQuery(spaceId: string) {
	await refreshWorkspaceProjectsQuery(spaceId)
}

export function useProjectsMutations() {
	const queryCache = useStoneFlowQueryCache()

	const invalidateProjects = async (scope: WorkspaceProjectListScope) => {
		await queryCache.invalidateQueries(
			{
				key: workspaceQueryKeys.projects.list(createProjectsScope(scope.spaceId)),
				exact: true,
			},
			'all',
		)
	}

	const setProjectsData = (
		scope: WorkspaceProjectListScope,
		data: WorkspaceProject[] | ((oldData: WorkspaceProject[] | undefined) => WorkspaceProject[]),
	) => {
		queryCache.setQueryData(workspaceQueryKeys.projects.list(scope), data)
	}

	return {
		invalidateProjects,
		setProjectsData,
	}
}
