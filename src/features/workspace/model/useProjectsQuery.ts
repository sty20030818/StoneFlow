import { useQuery, useQueryClient } from '@tanstack/vue-query'
import type { Ref } from 'vue'

import { listWorkspaceProjects } from '../queries'
import { workspaceQueryKeys, type WorkspaceProjectListScope } from './query-keys'

export interface UseProjectsQueryOptions {
	spaceId: string | Ref<string>
	enabled?: boolean | Ref<boolean>
	staleTime?: number
}

export function useProjectsQuery(options: UseProjectsQueryOptions) {
	const spaceId = typeof options.spaceId === 'string' ? options.spaceId : options.spaceId.value
	const enabled = typeof options.enabled === 'boolean' ? options.enabled : (options.enabled?.value ?? true)

	return useQuery({
		queryKey: workspaceQueryKeys.projects.list({ spaceId }),
		queryFn: () => listWorkspaceProjects(spaceId),
		enabled,
		staleTime: options.staleTime ?? 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	})
}

export function useProjectsMutations() {
	const queryClient = useQueryClient()

	const invalidateProjects = async (scope: WorkspaceProjectListScope) => {
		await queryClient.invalidateQueries({
			queryKey: workspaceQueryKeys.projects.list(scope),
			exact: true,
		})
	}

	const setProjectsData = (scope: WorkspaceProjectListScope, data: any) => {
		queryClient.setQueryData(workspaceQueryKeys.projects.list(scope), data)
	}

	return {
		invalidateProjects,
		setProjectsData,
	}
}
