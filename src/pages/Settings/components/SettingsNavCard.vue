<template>
	<SettingsSectionCard>
		<template #header>
			<div class="space-y-1">
				<div class="text-sm font-semibold text-default">{{ t('nav.settings.title') }}</div>
				<div class="text-xs text-muted">{{ t('nav.settings.description') }}</div>
			</div>
		</template>
		<nav class="space-y-2">
			<RouterLink
				v-for="item in navItems"
				:key="item.id"
				v-motion="navItemHoverMotion"
				:to="item.to"
				class="block rounded-2xl border px-3 py-2 transition-colors duration-150"
				:class="
					isActive(item.to) ? 'border-primary/40 bg-primary/8' : 'border-default/70 bg-elevated/20 hover:bg-elevated/40'
				">
				<div class="flex items-center gap-2">
					<UIcon
						:name="item.icon"
						class="size-4"
						:class="isActive(item.to) ? 'text-primary' : 'text-muted'" />
					<span class="text-sm font-medium text-default">{{ item.label }}</span>
				</div>
				<div class="mt-1 text-xs text-muted">{{ item.description }}</div>
			</RouterLink>
		</nav>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import { useI18n } from 'vue-i18n'
	import SettingsSectionCard from './SettingsSectionCard.vue'
	import type { SettingsNavItem } from '../config'

	const navItemHoverMotion = useCardHoverMotionPreset()
	const { t } = useI18n({ useScope: 'global' })

	defineProps<{
		navItems: ReadonlyArray<SettingsNavItem>
		isActive: (path: string) => boolean
	}>()
</script>
