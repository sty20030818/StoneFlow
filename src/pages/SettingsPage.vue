<template>
	<section class="mx-auto w-full max-w-6xl">
		<div class="min-w-0">
			<RouterView v-slot="{ Component, route }">
				<div :key="route.fullPath">
					<component :is="Component" />
				</div>
			</RouterView>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { useSettingsShellHeader } from '@/features/settings'

	useSettingsShellHeader()
</script>
