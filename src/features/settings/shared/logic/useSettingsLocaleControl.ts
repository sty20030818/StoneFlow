import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { appNuxtUiLocales, setAppLocale } from '@/i18n'
import { DEFAULT_LOCALE, normalizeAppLocale, type AppLocale } from '@/i18n/messages'
import { useSettingsStore } from '@/app/stores/settings'

export function useSettingsLocaleControl() {
	const settingsStore = useSettingsStore()
	const toast = useToast()
	const { locale, t } = useI18n({ useScope: 'global' })

	const selectedLocale = computed<AppLocale>({
		get() {
			return normalizeAppLocale(settingsStore.settings.locale) ?? normalizeAppLocale(locale.value) ?? DEFAULT_LOCALE
		},
		async set(value) {
			const nextLocale = normalizeAppLocale(value)
			if (!nextLocale) return
			let changed = false

			if (normalizeAppLocale(locale.value) !== nextLocale) {
				setAppLocale(nextLocale)
				changed = true
			}

			if (settingsStore.settings.locale !== nextLocale) {
				await settingsStore.update({ locale: nextLocale })
				changed = true
			}

			if (changed) {
				toast.add({
					title: t('locale.trayRestartNotice'),
					color: 'neutral',
				})
			}
		},
	})

	return {
		appNuxtUiLocales,
		selectedLocale,
		t,
	}
}
