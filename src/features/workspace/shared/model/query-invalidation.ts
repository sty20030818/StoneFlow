import { useStoneFlowQueryCache } from '@/features/shared'

export async function invalidateWorkspaceTaskQueries() {
	const queryCache = useStoneFlowQueryCache()
	await queryCache.invalidateQueries(
		{
			key: ['workspace', 'tasks'],
		},
		'all',
	)
}

export async function invalidateWorkspaceProjectQueries() {
	const queryCache = useStoneFlowQueryCache()
	await queryCache.invalidateQueries(
		{
			key: ['workspace', 'projects'],
		},
		'all',
	)
}

export async function invalidateWorkspaceTaskAndProjectQueries() {
	await Promise.all([invalidateWorkspaceTaskQueries(), invalidateWorkspaceProjectQueries()])
}
