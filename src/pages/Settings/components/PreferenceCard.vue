<template>
	<UCard class="space-y-4">
		<UFormField
			label="默认首页模式"
			description="启动时默认显示的页面">
			<USelect
				:model-value="model.homeView"
				:items="homeViewItems"
				value-key="value"
				class="w-64"
				color="neutral"
				@update:model-value="$emit('update:homeView', $event)" />
		</UFormField>

		<UFormField
			label="信息密度"
			description="界面布局的紧凑程度">
			<USelect
				:model-value="model.density"
				:items="densityItems"
				value-key="value"
				class="w-64"
				color="neutral"
				@update:model-value="$emit('update:density', $event)" />
		</UFormField>

		<USwitch
			:model-value="model.autoStart"
			label="创建即开始"
			description="默认开启（M0 只存值，M1 再接时间线规则）。"
			color="neutral"
			@update:model-value="$emit('update:autoStart', $event)" />
	</UCard>
</template>

<script setup lang="ts">
	import { ref } from 'vue'

	import type { SelectItem } from '@nuxt/ui'

	defineProps<{
		model: {
			homeView: string
			density: string
			autoStart: boolean
		}
	}>()

	defineEmits<{
		'update:homeView': [value: unknown]
		'update:density': [value: unknown]
		'update:autoStart': [value: boolean]
	}>()

	const homeViewItems = ref<SelectItem[]>([
		{ label: 'Today', value: 'today' },
		{ label: 'Projects', value: 'projects' },
		{ label: 'Focus（占位）', value: 'focus' },
		{ label: '未完成（Inbox）', value: 'inbox' },
	])

	const densityItems = ref<SelectItem[]>([
		{ label: '舒适', value: 'comfortable' },
		{ label: '紧凑', value: 'compact' },
	])
</script>
