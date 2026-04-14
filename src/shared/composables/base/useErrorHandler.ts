import { useI18n } from 'vue-i18n'

import { resolveErrorDetails, type ResolvedErrorDetails } from '@/shared/lib/error-message'

export type ApiError = {
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

type SuccessFeedbackInput =
	| string
	| {
			title: string
			description?: string
			duration?: number
	  }

type ErrorFeedbackInput =
	| string
	| {
			title?: string
			fallbackMessage?: string
			fallbackKey?: string
			description?: string
			duration?: number
	  }

export type ErrorReporter = (error: unknown, details: ResolvedErrorDetails) => void

function createDefaultErrorReporter(): ErrorReporter {
	return (error, details) => {
		console.error('[error-feedback]', {
			code: details.code,
			source: details.source,
			rawMessage: details.rawMessage,
			error,
		})
	}
}

function normalizeErrorInput(input?: ErrorFeedbackInput) {
	if (typeof input === 'string') {
		return {
			title: input,
			fallbackMessage: input,
		}
	}
	return input ?? {}
}

function normalizeSuccessInput(input: SuccessFeedbackInput) {
	if (typeof input === 'string') {
		return {
			title: input,
		}
	}
	return input
}

export function useErrorHandler(options: { report?: ErrorReporter } = {}) {
	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })
	const reportError = options.report ?? createDefaultErrorReporter()

	const handleApiError = (error: unknown, input?: ErrorFeedbackInput) => {
		const normalizedInput = normalizeErrorInput(input)
		const details = resolveErrorDetails(error, t, {
			fallbackKey: normalizedInput.fallbackKey,
			fallbackMessage: normalizedInput.fallbackMessage,
		})
		const title = normalizedInput.title ?? details.message
		const description = normalizedInput.description ?? (title === details.message ? undefined : details.message)

		reportError(error, details)
		toast.add({
			title,
			description,
			color: 'error',
			duration: normalizedInput.duration ?? 5000,
		})
	}

	const handleSuccess = (input: SuccessFeedbackInput) => {
		const normalizedInput = normalizeSuccessInput(input)
		toast.add({
			title: normalizedInput.title,
			description: normalizedInput.description,
			color: 'success',
			duration: normalizedInput.duration ?? 3000,
		})
	}

	const handleValidationError = (message: string) => {
		if (!message.trim()) {
			return
		}
		toast.add({
			title: message,
			color: 'error',
			duration: 4000,
		})
	}

	return {
		handleApiError,
		handleSuccess,
		handleValidationError,
	}
}
