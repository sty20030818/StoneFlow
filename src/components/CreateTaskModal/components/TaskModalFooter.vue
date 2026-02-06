<template>
	<UButton
		color="neutral"
		variant="ghost"
		size="sm"
		@click="emit('close')">
		Cancel
	</UButton>
	<UButton
		color="primary"
		size="sm"
		:disabled="!canSubmit"
		:loading="loading"
		@click="emit('submit')">
		Create Task
	</UButton>
</template>

<script setup lang="ts">
	defineProps<{
		loading: boolean
		canSubmit: boolean
	}>()

	const emit = defineEmits<{
		close: []
		submit: []
	}>()
</script>
