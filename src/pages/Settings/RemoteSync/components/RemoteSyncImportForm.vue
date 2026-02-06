<template>
	<div class="space-y-3">
		<UFormField
			label="JSON 文本"
			description='格式示例：[{"name":"主库","url":"postgresql://..."}]'>
			<UTextarea
				:model-value="text"
				placeholder="粘贴 JSON 数组"
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
	defineProps<{
		text: string
		error: string
		onUpdateText: (value: string) => void
	}>()
</script>
