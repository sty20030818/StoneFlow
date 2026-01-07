<template>
	<header class="h-12 shrink-0 border-b border-default px-4 flex items-center justify-between">
		<div class="text-sm font-medium text-default">
			{{ title }}
		</div>

		<div class="flex items-center gap-2">
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				class="gap-1"
				@click="openCommandPalette">
				<UKbd value="meta" />
				<UKbd value="K" />
			</UButton>
		</div>
	</header>
</template>

<script setup lang="ts">
	import { computed, inject } from 'vue'
	import { useRoute } from 'vue-router'

	const route = useRoute()
	const title = computed(() => String(route.meta.title ?? ''))

	// 注入命令面板控制
	const commandPalette = inject<{ open: () => void }>('commandPalette')

	function openCommandPalette() {
		commandPalette?.open()
	}
</script>
