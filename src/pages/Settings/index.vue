<template>
	<section class="mx-auto w-full max-w-6xl">
		<div class="grid gap-6 lg:grid-cols-[260px,1fr]">
			<SettingsNavCard
				v-motion="settingsNavMotion"
				class="h-fit"
				:nav-items="navItems"
				:is-active="isActive" />

			<div
				v-motion="settingsContentMotion"
				class="min-w-0">
				<RouterView v-slot="{ Component, route }">
					<div
						:key="route.fullPath"
						v-motion="settingsInnerPageMotion">
						<component :is="Component" />
					</div>
				</RouterView>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { useAppMotionPreset, useMotionPreset } from '@/composables/base/motion'
	import SettingsNavCard from './components/SettingsNavCard.vue'
	import { useSettingsNav } from './composables/useSettingsNav'

	const { navItems, isActive } = useSettingsNav()
	const settingsNavMotion = useAppMotionPreset('drawerSection', 'sectionBase')
	const settingsContentMotion = useAppMotionPreset('drawerSection', 'sectionBase', 18)
	const settingsInnerPageMotion = useMotionPreset('card')
</script>
