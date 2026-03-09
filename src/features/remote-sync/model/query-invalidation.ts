import { useStoneFlowQueryCache } from '@/features/shared'

export async function invalidateRemoteSyncProfilesQueries() {
	const queryCache = useStoneFlowQueryCache()
	await queryCache.invalidateQueries({
		key: ['remote-sync', 'profiles'],
	}, 'all')
}

export async function invalidateRemoteSyncHistoryQueries() {
	const queryCache = useStoneFlowQueryCache()
	await queryCache.invalidateQueries({
		key: ['remote-sync', 'history'],
	}, 'all')
}

export async function invalidateRemoteSyncQueries() {
	await Promise.all([invalidateRemoteSyncProfilesQueries(), invalidateRemoteSyncHistoryQueries()])
}
