import type { Query } from '@tanstack/vue-query'

import { stoneFlowQueryClient } from '@/features/shared'

import { workspaceQueryKeys } from './query-keys'

function byWorkspaceTaskQuery(query: Query): boolean {
	return workspaceQueryKeys.tasks.isMatch(query.queryKey)
}

function byWorkspaceProjectQuery(query: Query): boolean {
	return workspaceQueryKeys.projects.isMatch(query.queryKey)
}

export async function invalidateWorkspaceTaskQueries() {
	await stoneFlowQueryClient.invalidateQueries({
		predicate: byWorkspaceTaskQuery,
	})
}

export async function invalidateWorkspaceProjectQueries() {
	await stoneFlowQueryClient.invalidateQueries({
		predicate: byWorkspaceProjectQuery,
	})
	await stoneFlowQueryClient.refetchQueries({
		predicate: byWorkspaceProjectQuery,
		type: 'all',
	})
}

export async function invalidateWorkspaceTaskAndProjectQueries() {
	await Promise.all([invalidateWorkspaceTaskQueries(), invalidateWorkspaceProjectQueries()])
}
