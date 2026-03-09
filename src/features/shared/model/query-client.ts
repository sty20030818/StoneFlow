import { PiniaColadaQueryHooksPlugin, type PiniaColadaOptions, useQueryCache } from '@pinia/colada'
import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'
import type { Pinia } from 'pinia'

export const DEFAULT_QUERY_STALE_TIME = 30 * 1000
export const DEFAULT_QUERY_GC_TIME = 5 * 60 * 1000

function buildStoneFlowLegacyQueryClient() {
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

// 兼容层：
// - Colada 已成为新的统一查询运行时
// - 旧 TanStack client 仅在未迁移的查询封装中临时保留
export const stoneFlowLegacyQueryClient = buildStoneFlowLegacyQueryClient()
export const stoneFlowQueryClient = stoneFlowLegacyQueryClient

export function createStoneFlowLegacyQueryClient() {
	return stoneFlowLegacyQueryClient
}

export function createStoneFlowColadaOptions(
	options: Pick<PiniaColadaOptions, 'plugins'> = {},
): PiniaColadaOptions {
	return {
		queryOptions: {
			staleTime: DEFAULT_QUERY_STALE_TIME,
			gcTime: DEFAULT_QUERY_GC_TIME,
			refetchOnWindowFocus: false,
		},
		...options,
	}
}

export function createStoneFlowQueryHooksPlugin(
	options: Parameters<typeof PiniaColadaQueryHooksPlugin>[0],
) {
	return PiniaColadaQueryHooksPlugin(options)
}

export function useStoneFlowQueryCache(pinia?: Pinia) {
	return useQueryCache(pinia)
}
