<template>
	<UCard
		v-motion="userCardHoverMotion"
		variant="subtle"
		class="group cursor-default hover:shadow-lg transition-[box-shadow] duration-300"
		:ui="{
			root: 'rounded-xl',
			body: 'p-2.5 sm:p-2.5',
		}">
		<div class="flex items-center gap-2.5">
			<UChip
				color="success"
				position="bottom-right"
				inset>
				<UAvatar
					:src="avatarUrl"
					alt="石头鱼"
					size="md"
					:ui="{ root: 'rounded-lg' }" />
			</UChip>

			<div class="flex flex-col flex-1 min-w-0">
				<span class="text-[13px] font-medium text-default truncate">石头鱼</span>
				<span class="text-[11px] text-muted">Creator</span>
			</div>

			<RouterLink
				to="/settings/about"
				class="flex items-center justify-center w-8 h-8 rounded-full text-muted hover:bg-elevated hover:text-default transition-colors duration-200">
				<span v-motion="settingsIconHoverMotion">
					<UIcon
						name="i-lucide-settings"
						class="w-5 h-5" />
				</span>
			</RouterLink>
		</div>
	</UCard>
</template>

<script setup lang="ts">
	import type { MotionVariants } from '@vueuse/motion'
	import { computed } from 'vue'

	import { useMotionPreset } from '@/composables/base/motion'
	import avatarUrl from '@/assets/avatar.png'

	const cardMotionPreset = useMotionPreset('card')
	const userCardHoverMotion = computed<MotionVariants<string>>(() => ({
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
			y: -1,
			scale: 1.01,
			transition: cardMotionPreset.value.hovered?.transition,
		},
	}))
	const settingsIconHoverMotion = computed<MotionVariants<string>>(() => ({
		initial: {
			rotate: 0,
		},
		enter: {
			rotate: 0,
			transition: cardMotionPreset.value.hovered?.transition,
		},
		hovered: {
			rotate: 90,
			transition: cardMotionPreset.value.hovered?.transition,
		},
	}))
</script>
