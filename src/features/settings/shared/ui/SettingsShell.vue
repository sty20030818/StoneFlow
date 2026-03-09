<template>
	<section class="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
		<aside class="min-w-0 lg:sticky lg:top-24 lg:self-start">
			<SettingsNavCard
				:nav-items="navItems"
				:is-active="isActive" />
		</aside>

		<div class="min-w-0">
			<slot />
		</div>
	</section>
</template>

<script setup lang="ts">
	import { useSettingsNav } from '../composables/useSettingsNav'
	import SettingsNavCard from './partials/SettingsNavCard.vue'

	const { navItems, isActive } = useSettingsNav()
</script>
