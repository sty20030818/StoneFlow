<template>
	<UButton
		color="neutral"
		variant="ghost"
		size="sm"
		@click="emit('close')">
		{{ t('modals.createProject.buttons.cancel') }}
	</UButton>
	<UButton
		color="primary"
		size="sm"
		:disabled="!canSubmit"
		:loading="loading"
		@click="emit('submit')">
		{{ t('modals.createProject.buttons.submit') }}
	</UButton>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'

	defineProps<{
		loading: boolean
		canSubmit: boolean
	}>()
	const { t } = useI18n({ useScope: 'global' })

	const emit = defineEmits<{
		close: []
		submit: []
	}>()
</script>
