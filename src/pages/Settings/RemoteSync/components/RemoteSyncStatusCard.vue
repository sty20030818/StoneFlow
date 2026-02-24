<template>
	<SettingsSectionCard card-class="bg-elevated/60">
		<template #header>
			<div class="flex items-center justify-between">
				<div class="text-sm font-semibold">{{ t('settings.remoteSync.statusCard.title') }}</div>
				<div class="flex items-center gap-2">
					<UButton
						color="primary"
						variant="soft"
						size="sm"
						:loading="testingCurrent"
						:disabled="!hasActiveProfile"
						icon="i-lucide-activity"
						@click="onTestCurrent">
						{{ t('settings.remoteSync.actions.testCurrent') }}
					</UButton>
					<UBadge
						color="neutral"
						:variant="statusBadgeVariant"
						:class="statusBadgeClass">
						{{ statusLabel }}
					</UBadge>
				</div>
			</div>
		</template>
		<div class="space-y-3">
			<div class="text-sm text-muted">
				{{ statusMessage }}
			</div>
			<div
				v-if="activeProfile"
				v-motion="currentProfileHoverMotion"
				class="rounded-2xl border border-default/70 bg-default/70 px-4 py-3">
				<div class="text-xs text-muted">{{ t('settings.remoteSync.statusCard.currentProfile') }}</div>
				<div class="text-sm font-semibold truncate">{{ activeProfile.name }}</div>
			</div>
			<div
				v-else
				class="text-xs text-muted">
				{{ t('settings.remoteSync.statusCard.noProfile') }}
			</div>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'
	import type { RemoteDbProfile } from '@/types/shared/remote-sync'

	const currentProfileHoverMotion = useCardHoverMotionPreset()
	const { t } = useI18n({ useScope: 'global' })

	defineProps<{
		testingCurrent: boolean
		hasActiveProfile: boolean
		statusBadgeVariant: string
		statusBadgeClass: string
		statusLabel: string
		statusMessage: string
		activeProfile: RemoteDbProfile | null
		onTestCurrent: () => void
	}>()
</script>
