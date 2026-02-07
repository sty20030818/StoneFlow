import { createApp } from 'vue'
import App from './App.vue'

import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'

import { router } from './router'
import './styles/main.css'
import { initializeAppStartup } from '@/startup/initialize'
import { initializeIcons } from '@/startup/icons'

async function bootstrap() {
	const app = createApp(App)
	const pinia = createPinia()

	app.use(pinia).use(router).use(ui)

	try {
		await Promise.allSettled([initializeAppStartup(router), initializeIcons('critical')])
	} catch (error) {
		console.warn('[startup] degraded boot path', error)
	}

	app.mount('#app')

	// 图标预热不再阻塞首屏，放到挂载后后台执行
	void initializeIcons('full').catch((error) => {
		console.warn('[startup] icon warmup failed', error)
	})
}

void bootstrap()
