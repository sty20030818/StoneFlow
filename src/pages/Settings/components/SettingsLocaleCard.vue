<template>
	<SettingsSectionCard
		:title="t('locale.label')"
		:description="t('locale.description')">
		<ULocaleSelect
			v-model="selectedLocale"
			:locales="appNuxtUiLocales"
			:search-input="false"
			class="w-full" />
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useI18n } from 'vue-i18n'

	import { appNuxtUiLocales, setAppLocale } from '@/i18n'
	import { DEFAULT_LOCALE, normalizeAppLocale, type AppLocale } from '@/i18n/messages'
	import { useSettingsStore } from '@/stores/settings'
	import SettingsSectionCard from './SettingsSectionCard.vue'

	const settingsStore = useSettingsStore()
	const { locale, t } = useI18n({ useScope: 'global' })

	const selectedLocale = computed<AppLocale>({
		get() {
			return (
				normalizeAppLocale(settingsStore.settings.locale) ?? normalizeAppLocale(locale.value) ?? DEFAULT_LOCALE
			)
		},
		async set(value) {
			const nextLocale = normalizeAppLocale(value)
			if (!nextLocale) return

			if (normalizeAppLocale(locale.value) !== nextLocale) {
				setAppLocale(nextLocale)
			}

			if (settingsStore.settings.locale !== nextLocale) {
				await settingsStore.update({ locale: nextLocale })
			}
		},
	})
</script>
