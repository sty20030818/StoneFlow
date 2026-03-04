import type { QueryClient } from '@tanstack/query-core'
import { createPinia, type Pinia } from 'pinia'
import type { App as VueApp } from 'vue'
import type { Router } from 'vue-router'

import { installI18nPlugin } from '@/plugins/i18n'
import { createAppQueryClient, installQueryClientPlugin } from '@/plugins/query-client'
import { installUiPlugin } from '@/plugins/ui'

export type AppProviders = {
	pinia: Pinia
	queryClient: QueryClient
}

export function createAppProviders(): AppProviders {
	return {
		pinia: createPinia(),
		queryClient: createAppQueryClient(),
	}
}

export function installAppProviders(app: VueApp, router: Router, providers: AppProviders) {
	app.use(providers.pinia)
	installQueryClientPlugin(app, providers.queryClient)
	app.use(router)
	installI18nPlugin(app)
	installUiPlugin(app)
}
