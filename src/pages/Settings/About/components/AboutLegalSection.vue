<template>
	<SettingsSectionCard :title="t('settings.about.legal.title')">
		<div class="space-y-3">
			<div class="text-sm text-muted">{{ t('settings.about.legal.description') }}</div>
			<div class="flex flex-wrap gap-2">
				<UButton
					color="neutral"
					variant="ghost"
					size="xs"
					icon="i-lucide-file-text"
					@click="onOpenLink(licenseUrl)">
					{{ t('settings.about.legal.openLicense') }}
				</UButton>
				<UButton
					color="neutral"
					variant="ghost"
					size="xs"
					icon="i-lucide-shield"
					@click="onOpenLink(privacyUrl)">
					{{ t('settings.about.legal.openPrivacy') }}
				</UButton>
			</div>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'

	const { t } = useI18n({ useScope: 'global' })

	defineProps<{
		licenseUrl: string
		privacyUrl: string
		onOpenLink: (url: string) => void
	}>()
</script>
