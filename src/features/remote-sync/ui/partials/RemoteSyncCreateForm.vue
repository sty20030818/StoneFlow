<template>
	<div class="space-y-4">
		<UFormField
			:label="t('settings.remoteSync.form.name')"
			:description="t('settings.remoteSync.form.nameDescription')">
			<UInput
				:model-value="name"
				:placeholder="t('settings.remoteSync.form.namePlaceholder')"
				@update:model-value="onUpdateName" />
		</UFormField>

		<UFormField
			:label="t('settings.remoteSync.form.databaseUrl')"
			:description="t('settings.remoteSync.form.databaseUrlDescription')">
			<UTextarea
				:model-value="url"
				placeholder="postgresql://..."
				:rows="4"
				:ui="{ base: 'w-full' }"
				class="w-full font-mono text-xs"
				@update:model-value="onUpdateUrl" />
		</UFormField>
	</div>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	const { t } = useI18n({ useScope: 'global' })

	defineProps<{
		name: string
		url: string
		onUpdateName: (value: string) => void
		onUpdateUrl: (value: string) => void
	}>()
</script>
