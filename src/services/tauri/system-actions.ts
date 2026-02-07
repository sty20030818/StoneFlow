import { useClipboard } from '@vueuse/core'
import { openPath, openUrl } from '@tauri-apps/plugin-opener'

export async function openExternalUrl(url: string) {
	await openUrl(url)
}

export async function openLocalPath(path: string) {
	await openPath(path)
}

export async function copyText(text: string) {
	const clipboard = useClipboard()
	if (clipboard.isSupported.value) {
		await clipboard.copy(text)
		return
	}

	// 兜底：某些环境下 VueUse Clipboard 不可用时回退到原生 API。
	if (!navigator?.clipboard?.writeText) throw new Error('当前环境不支持剪贴板写入')
	await navigator.clipboard.writeText(text)
}
