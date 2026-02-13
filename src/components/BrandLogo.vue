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
	import { useActionIconHoverMotion } from '@/composables/base/motion'
	import avatarUrl from '@/assets/avatar.png'

	const logoAvatarHoverMotion = useActionIconHoverMotion({ hoverScale: 1.05 })
</script>
