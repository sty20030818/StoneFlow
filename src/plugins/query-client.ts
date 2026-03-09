import { PiniaColada } from '@pinia/colada'
import type { QueryClient } from '@tanstack/query-core'
import { VueQueryPlugin } from '@tanstack/vue-query'
import type { App as VueApp } from 'vue'

import {
	createStoneFlowColadaOptions,
	createStoneFlowLegacyQueryClient,
	createStoneFlowQueryHooksPlugin,
} from '@/features/shared'

export function createLegacyQueryClient(): QueryClient {
	return createStoneFlowLegacyQueryClient()
}

export function installQueryRuntimePlugins(app: VueApp, legacyQueryClient: QueryClient) {
	app.use(
		PiniaColada,
		createStoneFlowColadaOptions({
			plugins: [
				createStoneFlowQueryHooksPlugin({
					onError(error) {
						console.error('[colada-query]', error)
					},
				}),
			],
		}),
	)
	// 过渡期保留旧 provider，直到所有 feature 查询封装迁移完成。
	app.use(VueQueryPlugin, { queryClient: legacyQueryClient })
}
