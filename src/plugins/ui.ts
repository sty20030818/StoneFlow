import ui from '@nuxt/ui/vue-plugin'
import { MotionPlugin } from '@vueuse/motion'
import type { App as VueApp } from 'vue'

export function installUiPlugin(app: VueApp) {
	app.use(ui)
	app.use(MotionPlugin)
}
