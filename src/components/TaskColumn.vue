<template>
	<section>
		<!-- 简单的标题（不带 Card 包裹） -->
		<div class="flex items-center gap-3 mb-4 px-2">
			<button
				v-if="isEditMode"
				type="button"
				class="inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
				:class="columnSelectClass"
				:aria-label="`选择列 ${title}`"
				@click="$emit('toggle-column-select')">
				<span
					v-if="allSelected"
					class="size-3.5 rounded-full bg-error/80"></span>
				<UIcon
					v-else-if="indeterminate"
					name="i-lucide-minus"
					class="size-3.5 text-error" />
			</button>
			<!-- 图标指示器（根据状态不同） -->
			<TaskStatusIcon :status="getStatusFromTitle(title)" />
			<h3
				class="text-base font-extrabold"
				:class="getStatusFromTitle(title) === 'todo' ? 'text-default' : 'text-muted'">
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
					v-if="showInlineCreator && !isEditMode"
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
						:is-edit-mode="isEditMode"
						:selected="isTaskSelected(t.id)"
						:show-complete-button="showCompleteButton"
						:show-time="showTime"
						:show-space-label="showSpaceLabel"
						@click="$emit('task-click', t)"
						@complete="$emit('complete', t.id)"
						@toggle-select="$emit('toggle-task-select', t.id)"
						@request-delete="$emit('request-task-delete', t.id)" />
				</TransitionGroup>
			</div>
		</template>
	</section>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import EmptyState from '@/components/EmptyState.vue'
	import InlineTaskCreator from '@/components/InlineTaskCreator.vue'
import TaskCard from '@/components/TaskCard'
	import TaskStatusIcon from '@/components/TaskStatusIcon.vue'
	import { TASK_DONE_REASON_LABELS, TASK_STATUS_LABELS } from '@/config/task'
	import type { TaskDto } from '@/services/api/tasks'

	function getStatusFromTitle(title: string): string {
		if (title === TASK_STATUS_LABELS.todo || title === 'Todo') return 'todo'
		if (title.includes(TASK_DONE_REASON_LABELS.completed) || title === 'Done') return 'done'
		return 'todo'
	}

	const props = defineProps<{
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
		isEditMode?: boolean
		selectedTaskIdSet?: Set<string>
	}>()

	defineEmits<{
		complete: [taskId: string]
		'task-click': [task: TaskDto]
		'toggle-task-select': [taskId: string]
		'toggle-column-select': []
		'request-task-delete': [taskId: string]
	}>()

	const selectedCount = computed(() => {
		if (!props.selectedTaskIdSet) return 0
		return props.tasks.reduce((acc, t) => acc + (props.selectedTaskIdSet?.has(t.id) ? 1 : 0), 0)
	})

	const allSelected = computed(() => props.tasks.length > 0 && selectedCount.value === props.tasks.length)
	const indeterminate = computed(() => selectedCount.value > 0 && !allSelected.value)

	const columnSelectClass = computed(() => {
		if (allSelected.value) return 'border-error/80 bg-error/10'
		if (indeterminate.value) return 'border-error/70 bg-error/10'
		return 'border-default/60 bg-transparent hover:border-default'
	})

	function isTaskSelected(taskId: string) {
		return props.selectedTaskIdSet?.has(taskId) ?? false
	}
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
