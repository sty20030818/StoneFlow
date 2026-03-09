<template>
	<SettingsShell>
		<div class="min-w-0">
			<RouterView v-slot="{ Component, route }">
				<div :key="route.fullPath">
					<component :is="Component" />
				</div>
			</RouterView>
		</div>
	</SettingsShell>
</template>

<script setup lang="ts">
	import { SettingsShell } from '@/features/settings'
</script>
