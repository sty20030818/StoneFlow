import { useSettingsStore } from '@/stores/settings'

export async function installAppLifecyclePlugin() {
	const settingsStore = useSettingsStore()

	try {
		const { getCurrentWindow } = await import('@tauri-apps/api/window')
		const appWindow = getCurrentWindow()
		let closingWithFlush = false

		await appWindow.onCloseRequested(async (event) => {
			if (closingWithFlush) return
			event.preventDefault()
			closingWithFlush = true
			try {
				await settingsStore.flush()
			} finally {
				await appWindow.hide()
				closingWithFlush = false
			}
		})
	} catch (error) {
		console.warn('[startup] close flush hook skipped', error)
	}
}
