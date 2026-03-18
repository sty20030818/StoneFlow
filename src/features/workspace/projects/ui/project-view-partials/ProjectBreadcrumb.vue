<template>
	<div class="flex items-center gap-2">
		<span
			v-for="(item, index) in items"
			:key="index"
			class="flex items-center gap-2">
			<RouterLink
				v-if="item.to"
				:to="item.to"
				class="cursor-pointer rounded-full border border-default/70 bg-default/80 px-3 py-2 text-xs font-bold text-muted transition-colors hover:bg-elevated/70 hover:text-default">
				{{ item.label }}
			</RouterLink>
			<span
				v-else
				class="text-lg font-bold text-default">
				{{ item.label }}
			</span>
			<UIcon
				v-if="index < items.length - 1"
				name="i-lucide-chevron-right"
				class="size-3 text-muted/60" />
		</span>
	</div>
</template>

<script setup lang="ts">
	defineProps<{
		items: Array<{ label: string; to?: string }>
	}>()
</script>
