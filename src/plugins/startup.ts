import type { Router } from 'vue-router'

import { initializeIcons } from '@/app/startup/icons'
import { initializeAppStartup, type InitializeStartupOptions } from '@/app/startup/initialize'

export async function installStartupPlugin(router: Router, options: InitializeStartupOptions) {
	await Promise.allSettled([initializeAppStartup(router, options), initializeIcons('critical')])
}

export async function warmupStartupPlugin() {
	await initializeIcons('full')
}
