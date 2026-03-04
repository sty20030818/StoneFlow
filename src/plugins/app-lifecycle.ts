import { useSettingsStore } from '@/stores/settings'
import { useViewStateStore } from '@/stores/view-state'

export async function installAppLifecyclePlugin() {
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
