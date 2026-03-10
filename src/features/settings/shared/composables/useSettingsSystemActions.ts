import { useClipboard } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

import { useErrorHandler } from '@/composables/base/useErrorHandler'
import { copyText, openExternalUrl, openLocalPath } from '@/services/tauri/system-actions'

export function useSettingsSystemActions() {
	const { t } = useI18n({ useScope: 'global' })
	const { copy: copyToClipboard, isSupported } = useClipboard()
	const { handleApiError, handleSuccess } = useErrorHandler()

	async function copy(text: string, successMessage: string, failTitle = t('toast.settingsActions.copyFailedTitle')) {
		try {
			// 统一由 VueUse 封装剪贴板能力，避免页面层分散实现。
			if (!isSupported.value) {
				await copyText(text)
			} else {
				await copyToClipboard(text)
			}
			handleSuccess(successMessage)
		} catch (error) {
			handleApiError(error, {
				title: failTitle,
			})
		}
	}

	async function openUrl(url: string, failTitle = t('toast.settingsActions.openFailedTitle')) {
		try {
			await openExternalUrl(url)
		} catch (error) {
			handleApiError(error, {
				title: failTitle,
			})
		}
	}

	async function openPath(path: string, failTitle = t('toast.settingsActions.openFailedTitle')) {
		if (!path) return

		try {
			await openLocalPath(path)
		} catch (error) {
			handleApiError(error, {
				title: failTitle,
			})
		}
	}

	return {
		copy,
		openUrl,
		openPath,
	}
}
