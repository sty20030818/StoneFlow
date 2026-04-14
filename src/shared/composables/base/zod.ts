import type { ZodSchema } from 'zod'

type ValidationSuccess<T> = {
	ok: true
	data: T
}

type ValidationFailure = {
	ok: false
	message: string
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

function pickMessage(error: { issues?: Array<{ message?: string }> }): string {
	const message = error.issues?.[0]?.message
	if (message && message.trim()) return message
	return '输入不合法'
}

export function validateWithZod<T>(schema: ZodSchema<T>, input: unknown): ValidationResult<T> {
	const parsed = schema.safeParse(input)
	if (parsed.success) {
		return {
			ok: true,
			data: parsed.data,
		}
	}

	return {
		ok: false,
		message: pickMessage(parsed.error),
	}
}
