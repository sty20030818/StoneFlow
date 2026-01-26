<template>
	<div class="flex flex-col gap-2 items-end">
		<div
			v-for="stat in stats"
			:key="stat.label"
			class="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
			<UIcon
				:name="stat.icon"
				class="text-slate-400 text-lg" />
			<div class="flex flex-col items-end">
				<span class="text-[10px] font-bold text-slate-400 uppercase">{{ stat.label }}</span>
				<span class="text-xs font-bold text-slate-700">{{ stat.value }}</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	defineProps<{
		stats: Array<{ label: string; value: string | number; icon: string }>
	}>()
</script>
