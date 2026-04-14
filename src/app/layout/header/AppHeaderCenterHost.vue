<template>
	<div
		v-if="component"
		class="pointer-events-none absolute left-1/2 -translate-x-1/2">
		<div class="pointer-events-auto">
			<component :is="component" />
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { Component } from 'vue'

	defineProps<{
		component: Component | null
	}>()
</script>
