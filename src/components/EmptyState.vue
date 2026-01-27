<template>
	<div
		class="py-6 px-4 flex items-center justify-center gap-3 text-muted border-2 border-dashed border-default/60 rounded-3xl">
		<UIcon
			:name="icon"
			class="size-8" />
		<span class="font-medium">{{ text }}</span>
	</div>
</template>

<script setup lang="ts">
	withDefaults(
		defineProps<{
			text: string
			icon?: string
		}>(),
		{
			icon: 'i-lucide-coffee',
		},
	)
</script>
