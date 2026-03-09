import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'

import { listWorkspaceProjects } from '../../projects/queries'
import { workspaceQueryKeys, type WorkspaceProjectListScope, type WorkspaceProject } from '../model'
import { useStoneFlowQueryCache } from '@/features/shared'

const PROJECTS_QUERY_STALE_TIME = 5 * 60 * 1000
const PROJECTS_QUERY_GC_TIME = 10 * 60 * 1000

export type UseProjectsQueryOptions = {
	spaceId: MaybeRefOrGetter<string>
	enabled?: MaybeRefOrGetter<boolean>
	staleTime?: number
}

function createProjectsScope(spaceId: string): WorkspaceProjectListScope {
	return { spaceId }
}

function createProjectsListQueryOptions(spaceId: string, staleTime = PROJECTS_QUERY_STALE_TIME) {
	return {
		key: workspaceQueryKeys.projects.list(createProjectsScope(spaceId)),
		query: () => listWorkspaceProjects(spaceId),
		enabled: true,
		staleTime,
		gcTime: PROJECTS_QUERY_GC_TIME,
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
		refetchOnMount: true,
	}
}

export function useProjectsQuery(options: UseProjectsQueryOptions) {
	return useQuery(() => ({
		...createProjectsListQueryOptions(toValue(options.spaceId), options.staleTime),
		enabled: toValue(options.enabled) ?? true,
	}))
}

export function getWorkspaceProjectsSnapshot(spaceId: string): WorkspaceProject[] {
	const queryCache = useStoneFlowQueryCache()
	return (
		queryCache.getQueryData<WorkspaceProject[]>(workspaceQueryKeys.projects.list(createProjectsScope(spaceId))) ?? []
	)
}

export function getWorkspaceProjectById(spaceId: string, projectId: string): WorkspaceProject | null {
	return getWorkspaceProjectsSnapshot(spaceId).find((project) => project.id === projectId) ?? null
}

export function patchWorkspaceProjectSnapshot(spaceId: string, projectId: string, patch: Partial<WorkspaceProject>) {
	const queryCache = useStoneFlowQueryCache()
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
	const queryOptions = createProjectsListQueryOptions(spaceId)
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
