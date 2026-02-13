<template>
	<div
		v-motion="emptyStateMotion"
		class="py-6 px-4 flex items-center justify-center gap-3 text-muted border-2 border-dashed border-default/60 rounded-3xl">
		<UIcon
			:name="icon"
			class="size-8" />
		<span class="font-medium">{{ text }}</span>
	</div>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import { useMotionPresetWithDelay } from '@/composables/base/motion'

	const props = withDefaults(
		defineProps<{
			text: string
			icon?: string
			motionDelay?: number
		}>(),
		{
			icon: 'i-lucide-coffee',
			motionDelay: 0,
		},
	)

	const emptyStateMotionPreset = useMotionPresetWithDelay('card', props.motionDelay ?? 0)
	const emptyStateMotion = computed(() => emptyStateMotionPreset.value)
</script>
