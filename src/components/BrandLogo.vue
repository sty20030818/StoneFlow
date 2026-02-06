<template>
	<div class="flex items-center gap-3 px-2 py-2">
		<UChip
			color="success"
			position="bottom-right"
			inset>
			<UAvatar
				:src="avatarUrl"
				alt="StoneFlow"
				size="lg"
				:ui="{
					root: 'rounded-xl shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)] hover:scale-105 transition-transform duration-300',
				}" />
		</UChip>
		<div class="flex flex-col gap-0.5">
			<span class="text-sm font-semibold text-default tracking-tight">StoneFlow</span>
			<span class="text-[11px] text-muted">v0.1.1</span>
		</div>
	</div>
</template>

<script setup lang="ts">
	import avatarUrl from '@/assets/stoneflow.png'
</script>
