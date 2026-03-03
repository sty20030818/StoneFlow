import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'

export const DEFAULT_QUERY_STALE_TIME = 30 * 1000
export const DEFAULT_QUERY_GC_TIME = 5 * 60 * 1000

function buildStoneFlowQueryClient() {
	return new QueryClient({
		queryCache: new QueryCache(),
		mutationCache: new MutationCache(),
		defaultOptions: {
			queries: {
				staleTime: DEFAULT_QUERY_STALE_TIME,
				gcTime: DEFAULT_QUERY_GC_TIME,
				retry: 1,
				refetchOnWindowFocus: false,
			},
			mutations: {
				retry: 1,
			},
		},
	})
}

export const stoneFlowQueryClient = buildStoneFlowQueryClient()

export function createStoneFlowQueryClient() {
	return stoneFlowQueryClient
}
