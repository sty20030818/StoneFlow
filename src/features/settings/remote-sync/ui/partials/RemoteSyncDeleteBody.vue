<template>
	<div class="space-y-2 text-sm text-muted">
		<div>{{ t('settings.remoteSync.delete.confirmBody', { name }) }}</div>
		<div class="text-xs text-muted">{{ t('settings.remoteSync.delete.hint') }}</div>
	</div>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	const { t } = useI18n({ useScope: 'global' })

	defineProps<{
		name: string
	}>()
</script>
