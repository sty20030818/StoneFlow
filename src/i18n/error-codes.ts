const API_ERROR_CODE_TO_I18N_KEY = {
	VALIDATION_ERROR: 'errors.codes.VALIDATION_ERROR',
	DB_ERROR: 'errors.codes.DB_ERROR',
	INTERNAL_ERROR: 'errors.codes.INTERNAL_ERROR',
	SYNC_VALIDATION_ERROR: 'errors.codes.SYNC_VALIDATION_ERROR',
	SYNC_CONNECTION_ERROR: 'errors.codes.SYNC_CONNECTION_ERROR',
	SYNC_MIGRATION_ERROR: 'errors.codes.SYNC_MIGRATION_ERROR',
	SYNC_WATERMARK_READ_ERROR: 'errors.codes.SYNC_WATERMARK_READ_ERROR',
	SYNC_WATERMARK_WRITE_ERROR: 'errors.codes.SYNC_WATERMARK_WRITE_ERROR',
	SYNC_SOURCE_READ_ERROR: 'errors.codes.SYNC_SOURCE_READ_ERROR',
	SYNC_TARGET_STATE_ERROR: 'errors.codes.SYNC_TARGET_STATE_ERROR',
	SYNC_WRITE_ERROR: 'errors.codes.SYNC_WRITE_ERROR',
} as const

type ApiErrorCode = keyof typeof API_ERROR_CODE_TO_I18N_KEY

export function resolveApiErrorI18nKey(code: string | null | undefined): string | null {
	if (!code) return null
	const normalized = code.trim().toUpperCase() as ApiErrorCode
	return API_ERROR_CODE_TO_I18N_KEY[normalized] ?? null
}
