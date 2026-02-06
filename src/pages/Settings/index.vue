<template>
	<section class="mx-auto w-full max-w-6xl">
		<div class="grid gap-6 lg:grid-cols-[260px,1fr]">
			<SettingsNavCard
				class="h-fit"
				:nav-items="navItems"
				:is-active="isActive" />

			<div class="min-w-0">
				<RouterView />
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import SettingsNavCard from './components/SettingsNavCard.vue'
	import { useSettingsNav } from './composables/useSettingsNav'

	const { navItems, isActive } = useSettingsNav()
</script>
