import { createApp } from 'vue'

import App from '@/App.vue'
import { createAppProviders, installAppProviders } from '@/app/providers'
import { installAppLifecyclePlugin } from '@/plugins/app-lifecycle'
import { initializeAppLocale } from '@/plugins/i18n'
import { installStartupPlugin, warmupStartupPlugin } from '@/plugins/startup'
import { router } from '@/router'

function readLaunchHashAtBoot() {
	return window.location.hash ?? ''
}

export async function bootstrapApp(): Promise<void> {
	const app = createApp(App)
	const providers = createAppProviders()
	const launchHashAtBoot = readLaunchHashAtBoot()

	await initializeAppLocale()
	installAppProviders(app, router, providers)

	try {
		await installStartupPlugin(router, { launchHashAtBoot })
	} catch (error) {
		console.warn('[startup] degraded boot path', error)
	}

	app.mount('#app')
	void installAppLifecyclePlugin()

	void warmupStartupPlugin().catch((error) => {
		console.warn('[startup] icon warmup failed', error)
	})
}
