import { createApp } from 'vue'
import App from './App.vue'

import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'
import { MotionPlugin } from '@vueuse/motion'

import { router } from './router'
import './styles/main.css'
import { i18n, initializeAppLocale } from '@/i18n'
import { initializeAppStartup } from '@/startup/initialize'
import { initializeIcons } from '@/startup/icons'
import { useSettingsStore } from '@/stores/settings'
import { useViewStateStore } from '@/stores/view-state'

function readLaunchHashAtBoot() {
	return window.location.hash ?? ''
}

async function setupCloseFlushHook() {
	const settingsStore = useSettingsStore()
	const viewStateStore = useViewStateStore()

	try {
		const { getCurrentWindow } = await import('@tauri-apps/api/window')
		const appWindow = getCurrentWindow()
		let closingWithFlush = false

		await appWindow.onCloseRequested(async (event) => {
			if (closingWithFlush) return
			event.preventDefault()
			closingWithFlush = true
			try {
				await Promise.allSettled([settingsStore.flush(), viewStateStore.flush()])
			} finally {
				await appWindow.hide()
				closingWithFlush = false
			}
		})
	} catch (error) {
		console.warn('[startup] close flush hook skipped', error)
	}
}

async function bootstrap() {
	const app = createApp(App)
	const pinia = createPinia()
	const launchHashAtBoot = readLaunchHashAtBoot()

	await initializeAppLocale()

	app.use(pinia).use(router).use(i18n).use(ui).use(MotionPlugin)

	try {
		await Promise.allSettled([initializeAppStartup(router, { launchHashAtBoot }), initializeIcons('critical')])
	} catch (error) {
		console.warn('[startup] degraded boot path', error)
	}

	app.mount('#app')
	void setupCloseFlushHook()

	// 图标预热不再阻塞首屏，放到挂载后后台执行
	void initializeIcons('full').catch((error) => {
		console.warn('[startup] icon warmup failed', error)
	})
}

void bootstrap()
