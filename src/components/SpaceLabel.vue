<template>
	<span
		class="px-2 py-1 rounded-md bg-elevated text-muted text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
		<UIcon
			name="i-lucide-folder"
			class="size-3" />
		{{ label }}
	</span>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import { spaceLabel as getSpaceLabel } from '@/utils/space'

	const props = defineProps<{
		spaceId: string
	}>()

	const label = computed(() => getSpaceLabel(props.spaceId))
</script>
