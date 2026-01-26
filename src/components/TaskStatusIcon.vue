<template>
	<!-- 进行中：蓝色加载图标 -->
	<UIcon
		v-if="status === 'doing'"
		name="i-lucide-loader"
		class="size-4 text-blue-500" />
	<!-- 待办：橙色待办列表图标 -->
	<UIcon
		v-else-if="status === 'todo'"
		name="i-lucide-list-todo"
		class="size-4 text-orange-500" />
	<!-- 已完成：绿色勾选图标 -->
	<UIcon
		v-else-if="status === 'done'"
		name="i-lucide-check-circle"
		class="size-4 text-green-500" />
</template>

<script setup lang="ts">
	defineProps<{
		status: string
	}>()
</script>
