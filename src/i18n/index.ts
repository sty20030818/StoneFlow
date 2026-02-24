import { usePreferredLanguages } from '@vueuse/core'
import { createI18n } from 'vue-i18n'

import { settingsStore } from '@/services/tauri/store'
import { DEFAULT_LOCALE, messages, SUPPORTED_LOCALES, type AppLocale } from './messages'

const LANGUAGE_PREFIX_TO_LOCALE: Record<string, AppLocale> = {
	zh: 'zh-CN',
	en: 'en-US',
}

function normalizeLocale(value: string | null | undefined): AppLocale | null {
	if (!value) return null
	if ((SUPPORTED_LOCALES as readonly string[]).includes(value)) {
		return value as AppLocale
	}
	const normalized = value.replace('_', '-').toLowerCase()
	for (const locale of SUPPORTED_LOCALES) {
		if (locale.toLowerCase() === normalized) {
			return locale
		}
	}
	return LANGUAGE_PREFIX_TO_LOCALE[normalized] ?? null
}

function resolveLocaleFromPreferredLanguages(languages: readonly string[]): AppLocale | null {
	for (const raw of languages) {
		const direct = normalizeLocale(raw)
		if (direct) return direct
		const prefix = raw.split(/[-_]/)[0]?.toLowerCase()
		if (prefix && LANGUAGE_PREFIX_TO_LOCALE[prefix]) {
			return LANGUAGE_PREFIX_TO_LOCALE[prefix]
		}
	}
	return null
}

type SettingsWithLocale = {
	locale?: string
}

async function resolveLocaleFromUserSettings(): Promise<AppLocale | null> {
	try {
		const settings = await settingsStore.get<SettingsWithLocale>('settings')
		return normalizeLocale(settings?.locale)
	} catch {
		return null
	}
}

function resolveLocaleFromSystem(): AppLocale | null {
	if (typeof window === 'undefined') return null
	const preferred = usePreferredLanguages().value
	if (preferred.length > 0) {
		const locale = resolveLocaleFromPreferredLanguages(preferred)
		if (locale) return locale
	}
	if (typeof navigator !== 'undefined') {
		return resolveLocaleFromPreferredLanguages([navigator.language])
	}
	return null
}

async function resolveInitialLocale(): Promise<AppLocale> {
	const userLocale = await resolveLocaleFromUserSettings()
	if (userLocale) return userLocale

	const systemLocale = resolveLocaleFromSystem()
	if (systemLocale) return systemLocale

	return DEFAULT_LOCALE
}

export const i18n = createI18n({
	legacy: false,
	locale: DEFAULT_LOCALE,
	fallbackLocale: DEFAULT_LOCALE,
	messages,
})

function setLocale(locale: AppLocale) {
	i18n.global.locale.value = locale
}

export async function initializeAppLocale() {
	const locale = await resolveInitialLocale()
	setLocale(locale)
	return locale
}
