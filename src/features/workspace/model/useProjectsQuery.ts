import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'

import { listWorkspaceProjects } from '../queries'
import type { WorkspaceProject } from './types'
import { useStoneFlowQueryCache } from '@/features/shared'
import { workspaceQueryKeys, type WorkspaceProjectListScope } from './query-keys'

export type UseProjectsQueryOptions = {
	spaceId: MaybeRefOrGetter<string>
	enabled?: MaybeRefOrGetter<boolean>
	staleTime?: number
}

export function useProjectsQuery(options: UseProjectsQueryOptions) {
	return useQuery({
		key: () => workspaceQueryKeys.projects.list({ spaceId: toValue(options.spaceId) }),
		query: () => listWorkspaceProjects(toValue(options.spaceId)),
		enabled: () => toValue(options.enabled) ?? true,
		staleTime: options.staleTime ?? 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	})
}

export function useProjectsMutations() {
	const queryCache = useStoneFlowQueryCache()

	const invalidateProjects = async (scope: WorkspaceProjectListScope) => {
		await queryCache.invalidateQueries({
			key: workspaceQueryKeys.projects.list(scope),
			exact: true,
		}, 'all')
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
