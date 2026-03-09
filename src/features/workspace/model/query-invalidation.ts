import { stoneFlowLegacyQueryClient, useStoneFlowQueryCache } from '@/features/shared'

import { workspaceQueryKeys } from './query-keys'

export async function invalidateWorkspaceTaskQueries() {
	const queryCache = useStoneFlowQueryCache()
	await Promise.all([
		queryCache.invalidateQueries({
			key: ['workspace', 'tasks'],
		}, 'all'),
		stoneFlowLegacyQueryClient.invalidateQueries({
			predicate: (query) => workspaceQueryKeys.tasks.isMatch(query.queryKey),
		}),
	])
}

export async function invalidateWorkspaceProjectQueries() {
	const queryCache = useStoneFlowQueryCache()
	await Promise.all([
		queryCache.invalidateQueries({
			key: ['workspace', 'projects'],
		}, 'all'),
		stoneFlowLegacyQueryClient.invalidateQueries({
			predicate: (query) => workspaceQueryKeys.projects.isMatch(query.queryKey),
			refetchType: 'all',
		}),
	])
}

export async function invalidateWorkspaceTaskAndProjectQueries() {
	await Promise.all([invalidateWorkspaceTaskQueries(), invalidateWorkspaceProjectQueries()])
}
