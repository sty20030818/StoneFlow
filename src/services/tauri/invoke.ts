import { invoke } from '@tauri-apps/api/core'

export type BackendApiErrorShape = {
	code: string
	message: string
	details?: unknown
}

/** 前端统一的错误类型（便于 toast / 分支处理）。 */
export class ApiError extends Error {
	code?: string
	details?: unknown

	constructor(message: string, code?: string, details?: unknown) {
		super(message)
		this.name = 'ApiError'
		this.code = code
		this.details = details
	}
}

function normalizeInvokeError(err: unknown): ApiError {
	// Tauri 抛出的错误类型可能是 string / Error / object。
	if (typeof err === 'string') {
		try {
			const parsed = JSON.parse(err) as BackendApiErrorShape
			if (parsed && typeof parsed.message === 'string' && typeof parsed.code === 'string') {
				return new ApiError(parsed.message, parsed.code, parsed.details)
			}
		} catch {
			// ignore
		}
		return new ApiError(err)
	}

	if (err && typeof err === 'object') {
		const anyErr = err as { message?: unknown }
		if (typeof anyErr.message === 'string') {
			// 有些情况下 message 本身是 JSON 字符串
			try {
				const parsed = JSON.parse(anyErr.message) as BackendApiErrorShape
				if (parsed && typeof parsed.message === 'string' && typeof parsed.code === 'string') {
					return new ApiError(parsed.message, parsed.code, parsed.details)
				}
			} catch {
				// ignore
			}
			return new ApiError(anyErr.message)
		}
	}

	return new ApiError('未知错误')
}

export async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
	try {
		return await invoke<T>(command, args)
	} catch (err) {
		const apiErr = normalizeInvokeError(err)
		// 统一留痕：避免 silent fail
		console.error('[tauriInvoke]', command, args, apiErr)
		throw apiErr
	}
}
