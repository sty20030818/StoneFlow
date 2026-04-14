<template>
	<UApp
		:toaster="{ position: 'bottom-right', duration: 3000, max: 5 }"
		:locale="appNuxtUiLocale">
		<AppOverlays>
			<AppLayout>
				<RouterView v-slot="{ Component, route: viewRoute }">
					<component
						:is="Component"
						:key="viewRoute.fullPath" />
				</RouterView>
			</AppLayout>
		</AppOverlays>
	</UApp>
</template>

<script setup lang="ts">
	import { useAppTheme } from '@/app/logic/useAppTheme'
	import { AppLayout } from '@/app/layout'
	import { AppOverlays } from '@/app/overlays'
	import { appNuxtUiLocale } from '@/plugins/i18n'

	useAppTheme()
</script>
