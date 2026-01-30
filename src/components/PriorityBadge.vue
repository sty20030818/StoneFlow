<template>
	<span
		class="px-2 py-1 rounded-lg text-xs font-bold shrink-0"
		:class="priorityClass">
		{{ priority || 'P1' }}
	</span>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import { getPriorityClass, getPriorityTextClass } from '@/utils/priority'

	const props = defineProps<{
		priority?: string
		variant?: 'todo' | 'done' | 'cancelled'
	}>()

	const priorityClass = computed(() => {
		if (props.variant === 'todo') {
			return getPriorityTextClass(props.priority)
		}
		return getPriorityClass(props.priority)
	})
</script>
