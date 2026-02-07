import { useClipboard } from '@vueuse/core'

import { copyText, openExternalUrl, openLocalPath } from '@/services/tauri/system-actions'

export function useSettingsSystemActions() {
	const toast = useToast()
	const { copy: copyToClipboard, isSupported } = useClipboard()

	async function copy(text: string, successMessage: string, failTitle = '复制失败') {
		try {
			// 统一由 VueUse 封装剪贴板能力，避免页面层分散实现。
			if (!isSupported.value) {
				await copyText(text)
			} else {
				await copyToClipboard(text)
			}
			toast.add({ title: successMessage, color: 'success' })
		} catch (error) {
			toast.add({
				title: failTitle,
				description: error instanceof Error ? error.message : '未知错误',
				color: 'error',
			})
		}
	}

	async function openUrl(url: string, failTitle = '打开失败') {
		try {
			await openExternalUrl(url)
		} catch (error) {
			toast.add({
				title: failTitle,
				description: error instanceof Error ? error.message : '未知错误',
				color: 'error',
			})
		}
	}

	async function openPath(path: string, failTitle = '打开失败') {
		if (!path) return

		try {
			await openLocalPath(path)
		} catch (error) {
			toast.add({
				title: failTitle,
				description: error instanceof Error ? error.message : '未知错误',
				color: 'error',
			})
		}
	}

	return {
		copy,
		openUrl,
		openPath,
	}
}
