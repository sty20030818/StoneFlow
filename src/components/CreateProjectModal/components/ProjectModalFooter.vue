<template>
	<div class="flex items-center justify-end gap-2">
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
			Create Project
		</UButton>
	</div>
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
