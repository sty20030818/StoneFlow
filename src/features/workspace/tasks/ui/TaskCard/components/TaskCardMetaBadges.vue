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
	import { toRef } from 'vue'
	import type { WorkspaceTask } from '../../../../shared/model'

	import TaskCardMetaBadgePopover from './TaskCardMetaBadgePopover.vue'
	import { useTaskCardMetadataBadges } from '../composables/useTaskCardMetadataBadges'

	type Props = {
		task: Pick<WorkspaceTask, 'links' | 'customFields'>
	}

	const props = defineProps<Props>()

	const { badges } = useTaskCardMetadataBadges(toRef(props, 'task'))
</script>
