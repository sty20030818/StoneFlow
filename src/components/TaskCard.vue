<template>
	<div
		class="p-3 rounded-md border border-default bg-elevated flex items-center justify-between gap-3 cursor-pointer hover:bg-default transition"
		@click="$emit('click', task)">
		<div class="min-w-0">
			<div class="text-sm font-medium truncate">{{ task.title }}</div>
			<div
				v-if="showSpaceLabel"
				class="text-xs text-muted">
				{{ spaceLabel(task.space_id) }}
			</div>
		</div>

		<UButton
			v-if="showCompleteButton"
			size="sm"
			label="完成"
			color="success"
			variant="subtle"
			@click.stop="$emit('complete', task.id)" />

		<div
			v-if="showTime && task.completed_at"
			class="text-xs text-muted shrink-0">
			{{ new Date(task.completed_at).toLocaleTimeString() }}
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { TaskDto } from '@/services/api/tasks'

	const props = defineProps<{
		task: TaskDto
		showCompleteButton?: boolean
		showTime?: boolean
		showSpaceLabel?: boolean
	}>()

	defineEmits<{
		click: [task: TaskDto]
		complete: [taskId: string]
	}>()

	function spaceLabel(spaceId: string): string {
		const labels: Record<string, string> = {
			work: 'Work',
			personal: 'Personal',
			study: 'Study',
		}
		return labels[spaceId] ?? spaceId
	}
</script>

