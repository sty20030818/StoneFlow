export type DesktopShellPlatform = 'mac' | 'windows' | 'other'

function isTauriRuntime() {
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function detectDesktopShellPlatform(): DesktopShellPlatform {
	if (!isTauriRuntime() || typeof navigator === 'undefined') {
		return 'other'
	}

	const navigatorWithUserAgentData = navigator as Navigator & {
		userAgentData?: {
			platform?: string
		}
	}

	const platformCandidate =
		navigatorWithUserAgentData.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent

	const normalizedPlatform = platformCandidate.toLowerCase()

	if (normalizedPlatform.includes('mac')) {
		return 'mac'
	}

	if (normalizedPlatform.includes('win')) {
		return 'windows'
	}

	return 'other'
}

export async function runDesktopWindowAction(action: 'minimize' | 'toggleMaximize' | 'close') {
	try {
		const { getCurrentWindow } = await import('@tauri-apps/api/window')
		const appWindow = getCurrentWindow()

		if (action === 'minimize') {
			await appWindow.minimize()
			return
		}

		if (action === 'toggleMaximize') {
			await appWindow.toggleMaximize()
			return
		}

		await appWindow.close()
	} catch {
		// 浏览器预览或缺少窗口权限时静默降级，不阻断普通页面开发。
	}
}
