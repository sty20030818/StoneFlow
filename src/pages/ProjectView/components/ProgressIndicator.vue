<template>
	<!-- 圆形进度条 -->
	<div
		v-if="variant === 'circle'"
		class="relative w-16 h-16 flex items-center justify-center shrink-0">
		<svg class="transform -rotate-90 w-16 h-16">
			<circle
				cx="32"
				cy="32"
				r="26"
				stroke="currentColor"
				stroke-width="5"
				fill="transparent"
				class="text-elevated" />
			<circle
				cx="32"
				cy="32"
				r="26"
				stroke="currentColor"
				stroke-width="5"
				fill="transparent"
				:stroke-dasharray="26 * 2 * 3.14"
				:stroke-dashoffset="26 * 2 * 3.14 * (1 - percent / 100)"
				class="text-blue-500"
				stroke-linecap="round" />
		</svg>
		<div class="absolute inset-0 flex flex-col items-center justify-center">
			<span class="text-xs font-black text-default">{{ percent }}%</span>
		</div>
	</div>

	<!-- 水平进度条 -->
	<div
		v-else
		class="flex-1">
		<div class="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
			<span>Progress</span>
			<span>{{ percent }}% Done</span>
		</div>
		<div class="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
			<div
				class="h-full bg-slate-900 rounded-full relative transition-[width] duration-300"
				:style="{ width: `${percent}%` }">
				<div class="absolute inset-0 bg-white/20"></div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	withDefaults(
		defineProps<{
			percent: number
			variant?: 'circle' | 'horizontal'
		}>(),
		{
			variant: 'circle',
		},
	)
</script>
