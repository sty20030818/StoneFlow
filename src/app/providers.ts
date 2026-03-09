import type { QueryClient } from '@tanstack/query-core'
import { createPinia, type Pinia } from 'pinia'
import type { App as VueApp } from 'vue'
import type { Router } from 'vue-router'

import { installI18nPlugin } from '@/plugins/i18n'
import { createLegacyQueryClient, installQueryRuntimePlugins } from '@/plugins/query-client'
import { installUiPlugin } from '@/plugins/ui'

export type AppProviders = {
	pinia: Pinia
	legacyQueryClient: QueryClient
}

export function createAppProviders(): AppProviders {
	return {
		pinia: createPinia(),
		legacyQueryClient: createLegacyQueryClient(),
	}
}

export function installAppProviders(app: VueApp, router: Router, providers: AppProviders) {
	app.use(providers.pinia)
	installQueryRuntimePlugins(app, providers.legacyQueryClient)
	app.use(router)
	installI18nPlugin(app)
	installUiPlugin(app)
}
