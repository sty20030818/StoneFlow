import { resolveApiErrorI18nKey } from '@/i18n/error-codes'

type Translate = (key: string, params?: Record<string, unknown>) => string

export type ResolvedErrorSource = 'code' | 'message' | 'fallback'

export type ResolvedErrorDetails = {
	code: string | null
	i18nKey: string | null
	rawMessage: string | null
	message: string
	source: ResolvedErrorSource
}

function extractErrorCode(error: unknown): string | null {
	if (!error || typeof error !== 'object') return null
	const value = (error as { code?: unknown }).code
	return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function extractErrorMessage(error: unknown): string | null {
	if (error instanceof Error) {
		const message = error.message?.trim()
		return message && message.length > 0 ? message : null
	}
	if (typeof error === 'string') {
		const message = error.trim()
		return message.length > 0 ? message : null
	}
	if (typeof error === 'object' && error !== null) {
		const value = (error as { message?: unknown }).message
		if (typeof value === 'string') {
			const message = value.trim()
			return message.length > 0 ? message : null
		}
	}
	return null
}

export function resolveErrorDetails(
	error: unknown,
	t: Translate,
	options: {
		fallbackKey?: string
		fallbackMessage?: string
	} = {},
): ResolvedErrorDetails {
	const fallbackKey = options.fallbackKey ?? 'fallback.unknownError'
	const code = extractErrorCode(error)
	const i18nKey = resolveApiErrorI18nKey(code)
	if (i18nKey) {
		return {
			code,
			i18nKey,
			rawMessage: extractErrorMessage(error),
			message: t(i18nKey),
			source: 'code',
		}
	}

	const rawMessage = extractErrorMessage(error)
	if (rawMessage) {
		return {
			code,
			i18nKey: null,
			rawMessage,
			message: rawMessage,
			source: 'message',
		}
	}

	if (options.fallbackMessage?.trim()) {
		const fallbackMessage = options.fallbackMessage.trim()
		return {
			code,
			i18nKey: null,
			rawMessage: null,
			message: fallbackMessage,
			source: 'fallback',
		}
	}

	return {
		code,
		i18nKey: null,
		rawMessage: null,
		message: t(fallbackKey),
		source: 'fallback',
	}
}

export function resolveErrorMessage(
	error: unknown,
	t: Translate,
	options: {
		fallbackKey?: string
		fallbackMessage?: string
	} = {},
): string {
	return resolveErrorDetails(error, t, options).message
}
