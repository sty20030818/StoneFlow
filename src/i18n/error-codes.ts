const API_ERROR_CODE_TO_I18N_KEY = {
	VALIDATION_ERROR: 'errors.codes.VALIDATION_ERROR',
	DB_ERROR: 'errors.codes.DB_ERROR',
	INTERNAL_ERROR: 'errors.codes.INTERNAL_ERROR',
} as const

type ApiErrorCode = keyof typeof API_ERROR_CODE_TO_I18N_KEY

export function resolveApiErrorI18nKey(code: string | null | undefined): string | null {
	if (!code) return null
	const normalized = code.trim().toUpperCase() as ApiErrorCode
	return API_ERROR_CODE_TO_I18N_KEY[normalized] ?? null
}
