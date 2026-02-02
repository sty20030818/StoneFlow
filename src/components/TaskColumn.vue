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
					v-if="showInlineCreator"
					:space-id="spaceId"
					:project-id="projectId"
					:disabled="!spaceId || isEditMode" />

				<EmptyState
					v-if="tasks.length === 0"
					:text="emptyText" />

				<DraggableTaskList
					v-for="p in priorityList"
					:key="p"
					:tasks="tasksByPriority[p] || []"
					:priority="p"
					:disabled="isEditMode"
					:is-edit-mode="isEditMode"
					:selected-task-id-set="selectedTaskIdSet"
					:show-complete-button="showCompleteButton"
					:show-time="showTime"
					:show-space-label="showSpaceLabel"
					class="empty:hidden"
					@task-click="$emit('task-click', $event)"
					@complete="$emit('complete', $event)"
					@toggle-task-select="$emit('toggle-task-select', $event)"
					@request-task-delete="$emit('request-task-delete', $event)"
					@reorder="$emit('reorder', $event)" />
			</div>
		</template>
	</section>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import DraggableTaskList from '@/components/DraggableTaskList.vue'
	import EmptyState from '@/components/EmptyState.vue'
	import InlineTaskCreator from '@/components/InlineTaskCreator.vue'
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
		/** 优先级标识，用于限制拖拽范围。如果不传则允许组内任意拖拽 */
		priority?: string
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
		reorder: [tasks: TaskDto[]]
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

	const priorityList = computed(() => {
		if (props.priority && props.priority !== 'all') {
			return [props.priority]
		}
		return ['P0', 'P1', 'P2', 'P3']
	})

	const tasksByPriority = computed(() => {
		const groups: Record<string, TaskDto[]> = { P0: [], P1: [], P2: [], P3: [] }
		props.tasks.forEach((task) => {
			// 如果任务的 priority 不在预期范围内，默认归类到 P3 或保持原样
			// 这里假设后端返回的 priority 总是合法的 'P0'-'P3'
			const p = task.priority || 'P3'
			if (Array.isArray(groups[p])) {
				groups[p].push(task)
			} else {
				// Fallback: 如果是非常规 priority，放 P3
				groups['P3'].push(task)
			}
		})
		return groups
	})
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
