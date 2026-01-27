<template>
	<div class="flex items-center gap-2">
		<span
			v-for="(item, index) in items"
			:key="index"
			class="flex items-center gap-2">
			<RouterLink
				v-if="item.to"
				:to="item.to"
				class="px-3 py-2 rounded-full bg-slate-50 border border-slate-100 text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors">
				{{ item.label }}
			</RouterLink>
			<span
				v-else
				class="text-lg font-bold text-slate-800">
				{{ item.label }}
			</span>
			<UIcon
				v-if="index < items.length - 1"
				name="i-lucide-chevron-right"
				class="size-3 text-slate-300" />
		</span>
	</div>
</template>

<script setup lang="ts">
	defineProps<{
		items: Array<{ label: string; to?: string }>
	}>()
</script>
