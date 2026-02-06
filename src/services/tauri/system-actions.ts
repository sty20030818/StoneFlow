import { openPath, openUrl } from '@tauri-apps/plugin-opener'

export async function openExternalUrl(url: string) {
	await openUrl(url)
}

export async function openLocalPath(path: string) {
	await openPath(path)
}

export async function copyText(text: string) {
	if (!navigator?.clipboard?.writeText) {
		throw new Error('当前环境不支持剪贴板写入')
	}
	await navigator.clipboard.writeText(text)
}
