<template>
	<span
		v-if="timestamp"
		class="text-xs font-bold"
		:class="textClass">
		{{ formattedTime }}
	</span>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import { formatTime } from '@/utils/time'

	const props = defineProps<{
		timestamp: number | null
		textClass?: string
	}>()

	const formattedTime = computed(() => {
		if (!props.timestamp) return ''
		return formatTime(props.timestamp)
	})
</script>
