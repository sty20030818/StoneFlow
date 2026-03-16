import { PiniaColadaQueryHooksPlugin, type PiniaColadaOptions, useQueryCache } from '@pinia/colada'
import type { Pinia } from 'pinia'

// Colada 只承担运行时查询缓存，不参与本地持久化和页面快照恢复。
export const DEFAULT_QUERY_STALE_TIME = 30 * 1000
export const DEFAULT_QUERY_GC_TIME = 5 * 60 * 1000

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
