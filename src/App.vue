<template>
	<UApp
		:toaster="{ position: 'bottom-right', duration: 3000, max: 5 }"
		:locale="appNuxtUiLocale">
		<AppGlobalOverlays>
			<AppShell>
				<RouterView v-slot="{ Component, route: viewRoute }">
					<component
						:is="Component"
						:key="viewRoute.fullPath" />
				</RouterView>
			</AppShell>
		</AppGlobalOverlays>
	</UApp>
</template>

<script setup lang="ts">
	import { useAppTheme } from '@/composables/app/useAppTheme'
	import { appNuxtUiLocale } from '@/plugins/i18n'
	import { AppGlobalOverlays } from '@/features/app-shell'
	import AppShell from '@/layouts/AppShell.vue'

	useAppTheme()
</script>
