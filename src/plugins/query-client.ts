import { VueQueryPlugin } from '@tanstack/vue-query'
import type { QueryClient } from '@tanstack/query-core'
import type { App as VueApp } from 'vue'

import { createStoneFlowQueryClient } from '@/features/shared'

export function createAppQueryClient(): QueryClient {
	return createStoneFlowQueryClient()
}

export function installQueryClientPlugin(app: VueApp, queryClient: QueryClient) {
	app.use(VueQueryPlugin, { queryClient })
}
