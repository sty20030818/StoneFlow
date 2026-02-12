<template>
	<section class="space-y-4">
		<PageHeader
			:title="title"
			:description="description"
			:icon="icon"
			:icon-class="iconClass"
			:motion-delay="0" />

		<div v-motion="placeholderMotion">
			<UCard class="py-12">
				<div class="flex flex-col items-center justify-center gap-3">
					<UIcon
						name="i-lucide-construction"
						class="text-4xl text-muted" />
					<div class="text-sm text-muted">敬请期待</div>
				</div>
			</UCard>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import { useMotionPresetWithDelay } from '@/composables/base/motion'
	import PageHeader from './PageHeader.vue'

	defineProps<{
		title: string
		description: string
		icon: string
		iconClass: string
	}>()

	const placeholderMotionPreset = useMotionPresetWithDelay('card', 18)
	const placeholderMotion = computed(() => placeholderMotionPreset.value)
</script>
