<template>
	<SettingsSectionCard :title="t('settings.about.links.title')">
		<div class="space-y-2">
			<div
				v-for="link in links"
				:key="link.id"
				v-motion="linkItemHoverMotion"
				class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-default/70 bg-elevated/20 px-4 py-3">
				<div class="min-w-0">
					<div class="text-sm font-medium text-default">{{ link.label }}</div>
					<div class="truncate text-xs text-muted">{{ link.value }}</div>
				</div>
				<div class="flex items-center gap-2">
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-external-link"
						@click="onOpenLink(link.value)">
						{{ t('common.actions.open') }}
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-copy"
						@click="onCopyLink(link.value, t('settings.about.toast.linkCopied', { label: link.label }))">
						{{ t('common.actions.copy') }}
					</UButton>
				</div>
			</div>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'

	type AboutLink = {
		id: string
		label: string
		value: string
	}
	const linkItemHoverMotion = useCardHoverMotionPreset()
	const { t } = useI18n({ useScope: 'global' })

	defineProps<{
		links: AboutLink[]
		onOpenLink: (url: string) => void
		onCopyLink: (text: string, successMessage: string) => void
	}>()
</script>
