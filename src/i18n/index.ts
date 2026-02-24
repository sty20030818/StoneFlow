import { computed } from 'vue'
import { extendLocale } from '@nuxt/ui/composables'
import { en, zh_cn } from '@nuxt/ui/locale'
import { usePreferredLanguages } from '@vueuse/core'
import { createI18n } from 'vue-i18n'

import { settingsStore } from '@/services/tauri/store'
import { DEFAULT_LOCALE, messages, normalizeAppLocale, type AppLocale } from './messages'

const nuxtUiEnUSLocale = extendLocale(en, {
	code: 'en-US',
	name: 'English (US)',
})

const NUXT_UI_LOCALE_BY_APP_LOCALE = {
	'zh-CN': zh_cn,
	'en-US': nuxtUiEnUSLocale,
} as const

export const appNuxtUiLocales = [
	NUXT_UI_LOCALE_BY_APP_LOCALE['zh-CN'],
	NUXT_UI_LOCALE_BY_APP_LOCALE['en-US'],
]

function resolveLocaleFromPreferredLanguages(languages: readonly string[]): AppLocale | null {
	for (const raw of languages) {
		const direct = normalizeAppLocale(raw)
		if (direct) return direct
	}
	return null
}

type SettingsWithLocale = {
	locale?: string | null
}

async function resolveLocaleFromUserSettings(): Promise<AppLocale | null> {
	try {
		const settings = await settingsStore.get<SettingsWithLocale>('settings')
		return normalizeAppLocale(settings?.locale)
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

export function setAppLocale(locale: AppLocale) {
	i18n.global.locale.value = locale
}

export function resolveNuxtUiLocale(locale: AppLocale | null | undefined) {
	if (!locale) return NUXT_UI_LOCALE_BY_APP_LOCALE[DEFAULT_LOCALE]
	return NUXT_UI_LOCALE_BY_APP_LOCALE[locale] ?? NUXT_UI_LOCALE_BY_APP_LOCALE[DEFAULT_LOCALE]
}

export const appNuxtUiLocale = computed(() => {
	return resolveNuxtUiLocale(normalizeAppLocale(i18n.global.locale.value))
})

export async function initializeAppLocale() {
	const locale = await resolveInitialLocale()
	setAppLocale(locale)
	return locale
}
