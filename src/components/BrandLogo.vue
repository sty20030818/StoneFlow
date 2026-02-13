<template>
	<div class="flex items-center gap-3 px-2 py-2">
		<div
			v-motion="logoAvatarHoverMotion"
			class="shrink-0">
			<UChip
				color="success"
				position="bottom-right"
				inset>
				<UAvatar
					:src="avatarUrl"
					alt="StoneFlow"
					size="lg"
					:ui="{
						root: 'rounded-xl shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]',
					}" />
			</UChip>
		</div>
		<div class="flex flex-col gap-0.5">
			<span class="text-sm font-semibold text-default tracking-tight">StoneFlow</span>
			<span class="text-[11px] text-muted">v0.1.3</span>
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { MotionVariants } from '@vueuse/motion'
	import { computed } from 'vue'

	import { useMotionPreset } from '@/composables/base/motion'
	import avatarUrl from '@/assets/avatar.png'

	const cardMotionPreset = useMotionPreset('card')
	const logoAvatarHoverMotion = computed<MotionVariants<string>>(() => ({
		initial: {
			y: 0,
			scale: 1,
		},
		enter: {
			y: 0,
			scale: 1,
			transition: cardMotionPreset.value.hovered?.transition,
		},
		hovered: {
			y: 0,
			scale: 1.05,
			transition: cardMotionPreset.value.hovered?.transition,
		},
	}))
</script>
