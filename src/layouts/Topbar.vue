<template>
	<header class="h-12 shrink-0 border-b border-default px-4 flex items-center justify-between">
		<div class="text-sm font-medium text-default">
			{{ title }}
		</div>

		<div class="flex items-center gap-2">
			<UButton
				size="sm"
				color="neutral"
				variant="subtle"
				label="⌘K"
				disabled />
		</div>
	</header>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useRoute } from 'vue-router'

	const route = useRoute()
	const title = computed(() => String(route.meta.title ?? ''))
</script>
