<template>
	<section class="space-y-6">
		<div v-motion="cardMotions[0]">
			<SettingsSectionCard
				:title="t('settings.core.title')"
				:description="t('settings.core.description')">
				<div class="space-y-3 text-sm text-muted">
					<p>{{ t('settings.core.intro') }}</p>
				</div>
			</SettingsSectionCard>
		</div>

		<div v-motion="cardMotions[1]">
			<SettingsLocaleCard />
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useI18n } from 'vue-i18n'

	import { createStaggeredEnterMotions, getAppStaggerDelay, useMotionPreset } from '@/composables/base/motion'

	import { SettingsSectionCard } from '../../shared'
	import SettingsLocaleCard from './partials/SettingsLocaleCard.vue'

	const { t } = useI18n({ useScope: 'global' })
	const cardPreset = useMotionPreset('drawerSection')
	const cardMotions = computed(() => createStaggeredEnterMotions(2, cardPreset.value, getAppStaggerDelay))
</script>
