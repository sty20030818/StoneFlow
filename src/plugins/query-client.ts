import { PiniaColada } from '@pinia/colada'
import type { App as VueApp } from 'vue'

import { createStoneFlowColadaOptions, createStoneFlowQueryHooksPlugin } from '@/shared/query'

export function installQueryRuntimePlugins(app: VueApp) {
	app.use(
		PiniaColada,
		createStoneFlowColadaOptions({
			plugins: [
				createStoneFlowQueryHooksPlugin({
					onError(error: unknown) {
						console.error('[colada-query]', error)
					},
				}),
			],
		}),
	)
}
