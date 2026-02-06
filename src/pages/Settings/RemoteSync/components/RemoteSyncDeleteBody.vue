<template>
	<div class="space-y-2 text-sm text-muted">
		<div>确认删除「{{ name }}」？</div>
		<div class="text-xs text-muted">删除后将无法恢复，需要重新导入。</div>
	</div>
</template>

<script setup lang="ts">
	defineProps<{
		name: string
	}>()
</script>
