<template>
	<div class="space-y-4">
		<UFormField label="名称">
			<UInput
				:model-value="name"
				placeholder="配置名称"
				@update:model-value="onUpdateName" />
		</UFormField>

		<UFormField
			label="数据库地址"
			description="仅支持 postgres:// 或 postgresql:// 开头的连接字符串">
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
	defineProps<{
		name: string
		url: string
		onUpdateName: (value: string) => void
		onUpdateUrl: (value: string) => void
	}>()
</script>
