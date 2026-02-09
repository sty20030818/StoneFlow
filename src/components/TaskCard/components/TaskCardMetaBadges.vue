<template>
	<div
		v-if="badges.length > 0"
		class="flex items-center gap-2 shrink-0">
		<TaskCardMetaBadgePopover
			v-for="badge in badges"
			:key="badge.key"
			:icon="badge.icon"
			:label="badge.label"
			:count="badge.count"
			:items="badge.items" />
	</div>
</template>

<script setup lang="ts">
	import type { TaskDto } from '@/services/api/tasks'

	import TaskCardMetaBadgePopover from './TaskCardMetaBadgePopover.vue'
	import { useTaskCardMetadataBadges } from '../composables/useTaskCardMetadataBadges'

	type Props = {
		task: Pick<TaskDto, 'links' | 'customFields'>
	}

	const props = defineProps<Props>()

	const { badges } = useTaskCardMetadataBadges(props.task)
</script>
