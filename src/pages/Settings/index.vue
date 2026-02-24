<template>
	<section class="mx-auto w-full max-w-6xl">
		<div class="grid gap-6 lg:grid-cols-[260px,1fr]">
			<div class="space-y-6">
				<SettingsNavCard
					class="h-fit"
					:nav-items="navItems"
					:is-active="isActive" />
				<SettingsLocaleCard class="h-fit" />
			</div>

			<div class="min-w-0">
				<RouterView v-slot="{ Component, route }">
					<div :key="route.fullPath">
						<component :is="Component" />
					</div>
				</RouterView>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import SettingsNavCard from './components/SettingsNavCard.vue'
	import SettingsLocaleCard from './components/SettingsLocaleCard.vue'
	import { useSettingsNav } from './composables/useSettingsNav'

	const { navItems, isActive } = useSettingsNav()
</script>
