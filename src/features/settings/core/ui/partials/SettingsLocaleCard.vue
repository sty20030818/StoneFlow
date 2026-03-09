<template>
	<SettingsSectionCard
		:title="t('locale.label')"
		:description="t('locale.description')">
		<ULocaleSelect
			v-model="selectedLocale"
			:locales="appNuxtUiLocales"
			:search-input="false"
			class="w-full" />
		<p class="mt-2 text-xs text-muted">
			{{ t('locale.trayRestartNotice') }}
		</p>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import { useSettingsLocaleControl } from '../../composables/useSettingsLocaleControl'
	import { SettingsSectionCard } from '../../../shared'

	const { appNuxtUiLocales, selectedLocale, t } = useSettingsLocaleControl()
</script>
