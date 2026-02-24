import enUS from './locales/en-US'
import zhCN from './locales/zh-CN'

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]
export type MessageSchema = {
	app: {
		name: string
	}
	locale: {
		label: string
		options: Record<AppLocale, string>
	}
	common: {
		actions: {
			confirm: string
			cancel: string
			save: string
			close: string
		}
		status: {
			loading: string
			error: string
		}
	}
	fallback: {
		unknownError: string
	}
}

export const DEFAULT_LOCALE: AppLocale = 'zh-CN'

export const messages = {
	'zh-CN': zhCN,
	'en-US': enUS,
} satisfies Record<AppLocale, MessageSchema>
