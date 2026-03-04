import { useClipboard } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

import { copyText, openExternalUrl, openLocalPath } from '@/services/tauri/system-actions'
import { resolveErrorMessage } from '@/utils/error-message'

export function useSettingsSystemActions() {
	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })
	const { copy: copyToClipboard, isSupported } = useClipboard()

	async function copy(text: string, successMessage: string, failTitle = t('toast.settingsActions.copyFailedTitle')) {
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
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
		}
	}

	async function openUrl(url: string, failTitle = t('toast.settingsActions.openFailedTitle')) {
		try {
			await openExternalUrl(url)
		} catch (error) {
			toast.add({
				title: failTitle,
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
		}
	}

	async function openPath(path: string, failTitle = t('toast.settingsActions.openFailedTitle')) {
		if (!path) return

		try {
			await openLocalPath(path)
		} catch (error) {
			toast.add({
				title: failTitle,
				description: resolveErrorMessage(error, t),
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
