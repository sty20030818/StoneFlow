<template>
	<div
		v-motion="emptyStateMotion"
		class="rounded-3xl border-2 border-dashed border-default/60 px-4 py-6 text-muted"
		:class="stacked ? 'flex flex-col items-center justify-center gap-2 text-center' : ''">
		<template v-if="stacked">
			<UIcon
				:name="icon"
				class="size-6" />
			<p class="text-sm font-semibold text-default">{{ text }}</p>
			<div
				v-if="$slots.default"
				class="w-full max-w-md">
				<slot />
			</div>
		</template>
		<template v-else>
			<div class="flex items-center justify-center gap-3">
			<UIcon
				:name="icon"
				class="size-8" />
			<span class="text-base font-semibold">{{ text }}</span>
		</div>
			<div
				v-if="$slots.default"
				class="mt-2 px-1 text-center text-xs text-muted">
				<slot />
			</div>
		</template>
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
			stacked?: boolean
		}>(),
		{
			icon: 'i-lucide-coffee',
			motionDelay: 0,
			stacked: false,
		},
	)

	const emptyStateMotionPreset = useMotionPresetWithDelay('card', props.motionDelay ?? 0)
	const emptyStateMotion = computed(() => emptyStateMotionPreset.value)
</script>
