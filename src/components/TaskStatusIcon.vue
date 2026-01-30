<template>
	<!-- 待办：蓝色待办列表图标 -->
	<UIcon
		v-if="status === 'todo'"
		name="i-lucide-list-todo"
		class="size-4 text-blue-500" />
	<!-- 已取消：红色 X 图标 -->
	<UIcon
		v-else-if="status === 'done' && doneReason === 'cancelled'"
		name="i-lucide-x-circle"
		class="size-4 text-red-500" />
	<!-- 已完成：绿色勾选图标 -->
	<UIcon
		v-else-if="status === 'done'"
		name="i-lucide-check-circle"
		class="size-4 text-green-500" />
</template>

<script setup lang="ts">
	defineProps<{
		status: string
		doneReason?: string | null
	}>()
</script>
