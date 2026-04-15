<template>
	<div
		v-if="component"
		data-tauri-drag-region
		class="app-desktop-drag pointer-events-none absolute inset-y-0 left-1/2 flex w-full -translate-x-1/2 items-center justify-center"
		:style="overlayStyle">
		<div class="app-desktop-no-drag pointer-events-auto min-w-0 max-w-full">
			<component :is="component" />
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { Component, StyleValue } from 'vue'

	defineProps<{
		component: Component | null
		overlayStyle?: StyleValue
	}>()
</script>
