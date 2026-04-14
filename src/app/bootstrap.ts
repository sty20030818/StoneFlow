import { createApp } from 'vue'

import App from '@/App.vue'
import { createAppProviders, installAppProviders } from '@/app/providers'
import { preloadAppThemePreference } from '@/app/logic/useAppTheme'
import { markMotionStartupBooting, markMotionStartupReady } from '@/shared/composables/base/motion'
import { installAppLifecyclePlugin } from '@/plugins/app-lifecycle'
import { initializeAppLocale } from '@/plugins/i18n'
import { installStartupPlugin, warmupStartupPlugin } from '@/plugins/startup'
import { router } from '@/app/router'
import { installRemoteSyncCoordinator } from '@/infra/sync/remote-sync-coordinator'

function readLaunchHashAtBoot() {
	return window.location.hash ?? ''
}

export async function bootstrapApp(): Promise<void> {
	try {
		await preloadAppThemePreference()
	} catch (error) {
		console.warn('[startup] theme preload skipped', error)
	}

	const app = createApp(App)
	const providers = createAppProviders()
	const launchHashAtBoot = readLaunchHashAtBoot()
	markMotionStartupBooting()

	await initializeAppLocale()
	installAppProviders(app, router, providers)

	try {
		await installStartupPlugin(router, { launchHashAtBoot })
	} catch (error) {
		console.warn('[startup] degraded boot path', error)
	}

	void installRemoteSyncCoordinator().catch((error) => {
		console.warn('[startup] remote sync coordinator skipped', error)
	})

	app.mount('#app')
	if (typeof window !== 'undefined') {
		window.requestAnimationFrame(() => {
			markMotionStartupReady()
		})
	} else {
		markMotionStartupReady()
	}
	void installAppLifecyclePlugin()

	void warmupStartupPlugin().catch((error) => {
		console.warn('[startup] icon warmup failed', error)
	})
}
