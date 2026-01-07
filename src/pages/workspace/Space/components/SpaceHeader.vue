<template>
	<PageHeader
		:title="pageConfig.title"
		:description="pageConfig.description"
		:icon="pageConfig.icon"
		:icon-class="pageConfig.iconClass" />
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	const props = defineProps<{
		spaceId: string
	}>()

	const spaceConfigs: Record<string, { title: string; description: string; icon: string; iconClass: string }> = {
		work: {
			title: 'Work',
			description: '工作相关任务',
			icon: 'i-lucide-briefcase',
			iconClass: 'text-blue-500',
		},
		personal: {
			title: 'Personal',
			description: '个人事务',
			icon: 'i-lucide-user',
			iconClass: 'text-purple-500',
		},
		study: {
			title: 'Study',
			description: '学习相关任务',
			icon: 'i-lucide-book-open',
			iconClass: 'text-green-500',
		},
	}

	const pageConfig = computed(() => {
		return (
			spaceConfigs[props.spaceId] ?? {
				title: props.spaceId,
				description: '任务列表',
				icon: 'i-lucide-folder',
				iconClass: 'text-gray-500',
			}
		)
	})
</script>
