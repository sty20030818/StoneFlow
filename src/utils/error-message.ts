import { resolveApiErrorI18nKey } from '@/i18n/error-codes'

type Translate = (key: string, params?: Record<string, unknown>) => string

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
	return null
}

export function resolveErrorMessage(
	error: unknown,
	t: Translate,
	options: {
		fallbackKey?: string
	} = {},
): string {
	const fallbackKey = options.fallbackKey ?? 'fallback.unknownError'
	const codeKey = resolveApiErrorI18nKey(extractErrorCode(error))
	if (codeKey) return t(codeKey)

	const rawMessage = extractErrorMessage(error)
	if (rawMessage) return rawMessage

	return t(fallbackKey)
}
