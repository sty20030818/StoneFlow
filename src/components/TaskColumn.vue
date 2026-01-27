<template>
	<section>
		<!-- 简单的标题（不带 Card 包裹） -->
		<div class="flex items-center gap-3 mb-4 px-2">
			<!-- 图标指示器（根据状态不同） -->
			<TaskStatusIcon :status="getStatusFromTitle(title)" />
			<h3
				class="text-base font-extrabold"
				:class="getStatusFromTitle(title) === 'doing' ? 'text-default' : 'text-muted'">
				{{ title }}
			</h3>
		</div>

		<!-- 任务列表 -->
		<template v-if="loading">
			<div class="space-y-3">
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
			<div class="space-y-3">
				<InlineTaskCreator
					v-if="showInlineCreator"
					:space-id="spaceId"
					:project-id="projectId"
					:disabled="!spaceId" />

				<EmptyState
					v-if="tasks.length === 0"
					:text="emptyText" />

				<TransitionGroup
					v-else
					name="task-list"
					tag="div"
					class="space-y-3">
					<TaskCard
						v-for="t in tasks"
						:key="t.id"
						:task="t"
						:show-complete-button="showCompleteButton"
						:show-time="showTime"
						:show-space-label="showSpaceLabel"
						@click="$emit('task-click', t)"
						@complete="$emit('complete', t.id)" />
				</TransitionGroup>
			</div>
		</template>
	</section>
</template>

<script setup lang="ts">
	import EmptyState from '@/components/EmptyState.vue'
	import InlineTaskCreator from '@/components/InlineTaskCreator.vue'
	import TaskCard from '@/components/TaskCard.vue'
	import TaskStatusIcon from '@/components/TaskStatusIcon.vue'
	import type { TaskDto } from '@/services/api/tasks'

	function getStatusFromTitle(title: string): string {
		if (title === '进行中' || title === 'Doing') return 'doing'
		if (title === '待办' || title === 'Todo') return 'todo'
		if (title.includes('已完成') || title === 'Done') return 'done'
		return 'todo'
	}

	defineProps<{
		title: string
		tasks: TaskDto[]
		loading: boolean
		emptyText: string
		showCompleteButton?: boolean
		showTime?: boolean
		showSpaceLabel?: boolean
		skeletonCount?: number
		showInlineCreator?: boolean
		spaceId?: string
		projectId?: string | null
	}>()

	defineEmits<{
		complete: [taskId: string]
		'task-click': [task: TaskDto]
	}>()
</script>

<style scoped>
	.task-list-move,
	.task-list-enter-active,
	.task-list-leave-active {
		transition: all 160ms ease;
	}

	.task-list-enter-from,
	.task-list-leave-to {
		opacity: 0;
		transform: translateY(-4px);
	}

	.task-list-leave-active {
		position: relative;
	}
</style>
