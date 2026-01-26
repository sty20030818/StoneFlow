<template>
	<div class="py-12 flex flex-col items-center justify-center text-muted border-2 border-dashed border-default/60 rounded-3xl">
		<UIcon
			:name="icon"
			class="size-10 mb-2" />
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
