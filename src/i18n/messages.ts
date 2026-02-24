import enUS from './locales/en-US'
import zhCN from './locales/zh-CN'

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

const LOCALE_ALIAS_MAP: Readonly<Record<string, AppLocale>> = {
	zh: 'zh-CN',
	'zh-cn': 'zh-CN',
	'zh-hans': 'zh-CN',
	en: 'en-US',
	'en-us': 'en-US',
}

export function normalizeAppLocale(value: string | null | undefined): AppLocale | null {
	if (!value) return null

	if ((SUPPORTED_LOCALES as readonly string[]).includes(value)) {
		return value as AppLocale
	}

	const normalized = value.trim().replace(/_/g, '-').toLowerCase()
	for (const locale of SUPPORTED_LOCALES) {
		if (locale.toLowerCase() === normalized) {
			return locale
		}
	}

	if (LOCALE_ALIAS_MAP[normalized]) {
		return LOCALE_ALIAS_MAP[normalized]
	}

	const prefix = normalized.split('-')[0]
	return prefix ? LOCALE_ALIAS_MAP[prefix] ?? null : null
}

export type MessageSchema = Record<string, unknown>

export const DEFAULT_LOCALE: AppLocale = 'zh-CN'

export const messages = {
	'zh-CN': zhCN,
	'en-US': enUS,
} satisfies Record<AppLocale, MessageSchema>

export function buildRuntimeMessages() {
	return {
		...messages,
		zh: messages['zh-CN'],
		'zh-Hans': messages['zh-CN'],
		en: messages['en-US'],
	} satisfies Record<string, MessageSchema>
}
