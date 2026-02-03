import { createApp } from 'vue'
import App from './App.vue'

import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'

import { router } from './router'
import './styles/main.css'

import { useViewStateStore } from '@/stores/view-state'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia).use(router).use(ui)

async function init() {
	const viewState = useViewStateStore()
	// 等待 UI 状态加载完成，防止闪烁
	await viewState.load()
	app.mount('#app')
}

init().catch(console.error)
