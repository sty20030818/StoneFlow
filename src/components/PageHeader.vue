<template>
	<div class="space-y-1 mb-6">
		<div class="flex items-center gap-2 text-lg font-semibold">
			<UIcon
				v-if="icon"
				:name="icon"
				:class="iconClass" />
			<span>{{ title }}</span>
		</div>
		<div
			v-if="description"
			class="text-sm text-muted">
			{{ description }}
		</div>
	</div>
</template>

<script setup lang="ts">
	defineProps<{
		title: string
		description?: string
		icon?: string
		iconClass?: string
	}>()
</script>
