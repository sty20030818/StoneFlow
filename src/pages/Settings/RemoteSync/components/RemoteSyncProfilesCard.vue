<template>
	<SettingsSectionCard card-class="bg-default">
		<template #header>
			<div class="flex items-center justify-between gap-3">
				<div class="text-sm font-semibold">{{ t('settings.remoteSync.profiles.title') }}</div>
				<div class="flex flex-wrap items-center justify-end gap-2">
					<UButton
						color="neutral"
						variant="soft"
						size="xs"
						icon="i-lucide-plus"
						@click="onOpenCreate">
						{{ t('settings.remoteSync.actions.newProfile') }}
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-upload"
						@click="onOpenImport">
						{{ t('settings.remoteSync.actions.importProfiles') }}
					</UButton>
				</div>
			</div>
		</template>
		<div class="space-y-2">
			<div
				v-if="profiles.length === 0"
				class="text-sm text-muted">
				{{ t('settings.remoteSync.profiles.empty') }}
			</div>
			<div
				v-for="profile in profiles"
				:key="profile.id"
				v-motion="profileItemHoverMotion"
				class="flex items-center justify-between gap-3 rounded-2xl border border-default/70 bg-elevated/40 px-4 py-3">
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						<div class="text-sm font-semibold truncate">{{ profile.name }}</div>
						<UBadge
							v-if="profile.id === activeProfileId"
							color="primary"
							variant="soft">
							{{ t('settings.remoteSync.profiles.current') }}
						</UBadge>
					</div>
					<div class="text-[11px] text-muted">
						{{ formatProfileMeta(profile) }}
					</div>
				</div>
				<div class="flex items-center gap-2">
					<UButton
						v-if="profile.id !== activeProfileId"
						color="neutral"
						variant="soft"
						size="xs"
						@click="onSetActive(profile.id)">
						{{ t('settings.remoteSync.profiles.setCurrent') }}
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-pen"
						@click="onOpenEdit(profile)">
						{{ t('common.actions.edit') }}
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-trash-2"
						@click="onOpenDelete(profile)">
						{{ t('common.actions.delete') }}
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
	import type { RemoteDbProfile } from '@/types/shared/remote-sync'

	const profileItemHoverMotion = useCardHoverMotionPreset()
	const { t } = useI18n({ useScope: 'global' })

	defineProps<{
		profiles: RemoteDbProfile[]
		activeProfileId: string | null
		formatProfileMeta: (profile: RemoteDbProfile) => string
		onOpenCreate: () => void
		onOpenImport: () => void
		onSetActive: (profileId: string) => void
		onOpenEdit: (profile: RemoteDbProfile) => void
		onOpenDelete: (profile: RemoteDbProfile) => void
	}>()
</script>
