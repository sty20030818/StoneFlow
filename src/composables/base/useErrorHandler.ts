import { useI18n } from 'vue-i18n'

import { useToast } from '#imports'

export interface ApiError {
	code: string
	message: string
	status?: number
}

export class AppError extends Error {
	constructor(
		public code: string,
		message: string,
		public status?: number,
	) {
		super(message)
		this.name = 'AppError'
	}
}

export function isApiError(error: unknown): error is ApiError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		'message' in error &&
		typeof (error as ApiError).code === 'string' &&
		typeof (error as ApiError).message === 'string'
	)
}

export function useErrorHandler() {
	const toast = useToast()
	const { t } = useI18n()

	const handleApiError = (error: unknown, fallbackMessage?: string) => {
		console.error('API Error:', error)

		if (isApiError(error)) {
			const message = t(`errors.${error.code}`, fallbackMessage || error.message)
			toast.add({
				title: message,
				color: 'error',
				timeout: 5000,
			})
		} else if (error instanceof Error) {
			toast.add({
				title: error.message || fallbackMessage || t('errors.unknown'),
				color: 'error',
				timeout: 5000,
			})
		} else {
			toast.add({
				title: fallbackMessage || t('errors.unknown'),
				color: 'error',
				timeout: 5000,
			})
		}
	}

	const handleSuccess = (message: string) => {
		toast.add({
			title: message,
			color: 'success',
			timeout: 3000,
		})
	}

	return {
		handleApiError,
		handleSuccess,
	}
}
