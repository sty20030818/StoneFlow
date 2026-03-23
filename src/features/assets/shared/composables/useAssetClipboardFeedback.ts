import { useClipboard } from '@vueuse/core'

type AssetClipboardFeedbackOptions = {
	successTitle: string
	emptyTitle: string
	errorTitle: string
}

export function useAssetClipboardFeedback() {
	const toast = useToast()
	const { copy } = useClipboard()

	async function copyWithFeedback(value: string, options: AssetClipboardFeedbackOptions): Promise<boolean> {
		if (!value.trim()) {
			toast.add({
				title: options.emptyTitle,
				color: 'neutral',
			})
			return false
		}

		try {
			await copy(value)
			toast.add({
				title: options.successTitle,
				color: 'success',
			})
			return true
		} catch {
			toast.add({
				title: options.errorTitle,
				color: 'error',
			})
			return false
		}
	}

	return {
		copyWithFeedback,
	}
}
