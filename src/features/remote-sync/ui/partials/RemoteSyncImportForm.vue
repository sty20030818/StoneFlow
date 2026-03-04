<template>
	<div class="space-y-3">
		<UFormField
			:label="t('settings.remoteSync.import.jsonText')"
			:description="t('settings.remoteSync.import.formatExample')">
			<UTextarea
				:model-value="text"
				:placeholder="t('settings.remoteSync.import.placeholder')"
				:rows="6"
				class="font-mono text-xs"
				@update:model-value="onUpdateText" />
		</UFormField>
		<div
			v-if="error"
			class="text-xs text-error">
			{{ error }}
		</div>
	</div>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	const { t } = useI18n({ useScope: 'global' })

	defineProps<{
		text: string
		error: string
		onUpdateText: (value: string) => void
	}>()
</script>
