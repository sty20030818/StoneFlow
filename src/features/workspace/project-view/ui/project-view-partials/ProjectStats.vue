<template>
	<div class="flex flex-col gap-2 items-end">
		<div
			v-for="stat in stats"
			:key="stat.label"
			class="flex items-center gap-2 rounded-xl border border-default/70 bg-default/80 px-4 py-2 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.28)] dark:shadow-[0_12px_28px_-22px_rgba(0,0,0,0.6)]">
			<UIcon
				:name="stat.icon"
				class="text-lg text-muted" />
			<div class="flex flex-col items-end">
				<span class="text-[10px] font-bold uppercase text-muted">{{ stat.label }}</span>
				<span class="text-xs font-bold text-default">{{ stat.value }}</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	defineProps<{
		stats: Array<{ label: string; value: string | number; icon: string }>
	}>()
</script>
