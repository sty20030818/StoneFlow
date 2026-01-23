<template>
	<UCard>
		<template #header>
			<div class="flex items-center justify-between">
				<div class="text-sm font-semibold text-default">{{ title }}</div>
				<template v-if="loading">
					<USkeleton class="h-5 w-6 rounded-full" />
				</template>
				<UBadge
					v-else
					color="neutral"
					variant="subtle"
					size="sm">
					{{ tasks.length }}
				</UBadge>
			</div>
		</template>

		<template v-if="loading">
			<div class="space-y-2">
				<div
					v-for="i in skeletonCount"
					:key="i"
					class="p-3 rounded-md border border-default bg-elevated flex items-center justify-between gap-3">
					<div class="space-y-2 flex-1">
						<USkeleton class="h-4 w-3/4" />
						<USkeleton
							v-if="showSpaceLabel"
							class="h-3 w-16" />
					</div>
					<USkeleton
						v-if="showCompleteButton"
						class="h-8 w-14 rounded-md" />
					<USkeleton
						v-if="showTime"
						class="h-3 w-12" />
				</div>
			</div>
		</template>
		<template v-else>
			<div
				v-if="tasks.length === 0"
				class="text-sm text-muted py-4 text-center">
				{{ emptyText }}
			</div>

			<div
				v-else
				class="space-y-2">
				<TaskCard
					v-for="t in tasks"
					:key="t.id"
					:task="t"
					:show-complete-button="showCompleteButton"
					:show-time="showTime"
					:show-space-label="showSpaceLabel"
					@click="$emit('task-click', t)"
					@complete="$emit('complete', t.id)" />
			</div>
		</template>
	</UCard>
</template>

<script setup lang="ts">
	import TaskCard from '@/components/TaskCard.vue'
	import type { TaskDto } from '@/services/api/tasks'

	defineProps<{
		title: string
		tasks: TaskDto[]
		loading: boolean
		emptyText: string
		showCompleteButton?: boolean
		showTime?: boolean
		showSpaceLabel?: boolean
		skeletonCount?: number
	}>()

	defineEmits<{
		complete: [taskId: string]
		'task-click': [task: TaskDto]
	}>()
</script>
