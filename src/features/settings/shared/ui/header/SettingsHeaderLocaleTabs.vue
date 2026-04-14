<template>
	<UTabs
		:items="localeTabItems"
		:model-value="selectedLocale"
		:content="false"
		color="neutral"
		variant="pill"
		size="sm"
		:ui="localeTabsUi"
		@update:model-value="onLocaleTabChange">
		<template #leading="{ item }">
			<LocaleFlag
				:locale="item.locale"
				class="size-3.5 shrink-0" />
		</template>
	</UTabs>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import LocaleFlag from '@/shared/ui/shared/LocaleFlag.vue'

	import { useSettingsLocaleControl } from '../../logic/useSettingsLocaleControl'

	const { selectedLocale, t } = useSettingsLocaleControl()

	const localeTabsUi = {
		root: 'w-[148px]',
		list: 'w-full rounded-full bg-elevated/70 border border-default/80 p-1 gap-1',
		trigger:
			'flex-1 rounded-full px-2 py-1.5 text-[11px] font-medium hover:data-[state=inactive]:bg-default/40 hover:data-[state=inactive]:text-default data-[state=active]:text-default',
		indicator: 'rounded-full shadow-sm bg-default inset-y-1',
	}
	const localeTabItems = computed(() => [
		{
			label: t('locale.compactOptions.zh'),
			value: 'zh-CN',
			locale: 'zh-CN' as const,
		},
		{
			label: t('locale.compactOptions.en'),
			value: 'en-US',
			locale: 'en-US' as const,
		},
	])

	function onLocaleTabChange(value: string | number) {
		if (value !== 'zh-CN' && value !== 'en-US') return
		selectedLocale.value = value
	}
</script>
