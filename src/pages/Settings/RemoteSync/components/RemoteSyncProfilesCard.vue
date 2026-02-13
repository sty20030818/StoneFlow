<template>
	<SettingsSectionCard card-class="bg-default">
		<template #header>
			<div class="flex items-center justify-between">
				<div class="text-sm font-semibold">配置列表</div>
				<div class="flex items-center gap-2">
					<UButton
						color="neutral"
						variant="soft"
						size="xs"
						icon="i-lucide-plus"
						@click="onOpenCreate">
						新建配置
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-upload"
						@click="onOpenImport">
						导入配置
					</UButton>
				</div>
			</div>
		</template>
		<div class="space-y-2">
			<div
				v-if="profiles.length === 0"
				class="text-sm text-muted">
				暂无配置
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
							当前
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
						设为当前
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-pen"
						@click="onOpenEdit(profile)">
						编辑
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-trash-2"
						@click="onOpenDelete(profile)">
						删除
					</UButton>
				</div>
			</div>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'
	import type { RemoteDbProfile } from '@/types/shared/remote-sync'

	const profileItemHoverMotion = useCardHoverMotionPreset()

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
