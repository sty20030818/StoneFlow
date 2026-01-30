<template>
	<UIcon
		v-if="statusIcon"
		:name="statusIcon.icon"
		class="size-4"
		:class="statusIcon.iconClass" />
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import { TASK_DONE_REASON_OPTIONS, TASK_STATUS_OPTIONS } from '@/config/task'

	const props = defineProps<{
		status: string
		doneReason?: string | null
	}>()

	const todoOption = TASK_STATUS_OPTIONS.find((item) => item.value === 'todo')
	const completedOption = TASK_DONE_REASON_OPTIONS.find((item) => item.value === 'completed')
	const cancelledOption = TASK_DONE_REASON_OPTIONS.find((item) => item.value === 'cancelled')

	const statusIcon = computed(() => {
		if (props.status === 'done') {
			if (props.doneReason?.toLowerCase() === 'cancelled') return cancelledOption ?? completedOption
			return completedOption ?? todoOption
		}

		return todoOption
	})
</script>
