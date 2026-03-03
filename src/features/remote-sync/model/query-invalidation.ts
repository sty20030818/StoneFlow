import type { Query } from '@tanstack/vue-query'

import { stoneFlowQueryClient } from '@/features/shared'

import { remoteSyncQueryKeys } from './query-keys'

function byRemoteSyncProfilesQuery(query: Query): boolean {
	return remoteSyncQueryKeys.profiles.isMatch(query.queryKey)
}

function byRemoteSyncHistoryQuery(query: Query): boolean {
	return remoteSyncQueryKeys.history.isMatch(query.queryKey)
}

export async function invalidateRemoteSyncProfilesQueries() {
	await stoneFlowQueryClient.invalidateQueries({
		predicate: byRemoteSyncProfilesQuery,
	})
}

export async function invalidateRemoteSyncHistoryQueries() {
	await stoneFlowQueryClient.invalidateQueries({
		predicate: byRemoteSyncHistoryQuery,
	})
}

export async function invalidateRemoteSyncQueries() {
	await Promise.all([invalidateRemoteSyncProfilesQueries(), invalidateRemoteSyncHistoryQueries()])
}
