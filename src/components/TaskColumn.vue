<template>
	<section>
		<!-- 简单的标题（不带 Card 包裹） -->
		<div
			v-motion="columnHeaderMotion"
			class="flex items-center gap-3 mb-4 px-2">
			<button
				v-if="isEditMode"
				type="button"
				class="inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
				:class="columnSelectClass"
				:aria-label="t('taskColumn.selectColumnAria', { title })"
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
			<TaskStatusIcon :status="columnStatusValue" />
			<h3
				class="text-base font-extrabold"
				:class="columnStatusValue === 'todo' ? 'text-default' : 'text-muted'">
				{{ title }}
			</h3>
		</div>

		<!-- 任务列表 -->
		<template v-if="loading">
			<div class="rounded-md border border-default bg-elevated px-3 py-2 text-xs text-muted">
				{{ t('common.status.loading') }}...
			</div>
		</template>
		<template v-else>
			<div class="space-y-3">
				<InlineTaskCreator
					v-if="showInlineCreator && !isDoneColumn"
					:space-id="spaceId"
					:project-id="projectId"
					:enter-delay="todoInlineDelay"
					:disabled="!spaceId || isEditMode" />

				<div
					v-if="tasks.length === 0"
					v-motion="emptyStateMotion">
					<EmptyState :text="emptyText" />
				</div>

				<template v-if="!isDoneColumn && tasks.length > 0">
					<DraggableTaskList
						v-for="(p, priorityIndex) in priorityList"
						:key="p"
						:tasks="tasksByPriority[p] || []"
						:priority="p"
						:motion-base-delay="todoListBaseDelay + priorityIndex * priorityGroupStep"
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
				</template>
				<div
					v-else
					class="flex flex-col gap-3">
					<div
						v-for="(task, index) in doneTasks"
						:key="task.id"
						v-motion="doneTaskMotions[index]">
						<TaskCard
							:task="task"
							:is-edit-mode="isEditMode"
							:selected="isTaskSelected(task.id)"
							:show-complete-button="showCompleteButton"
							:show-time="showTime"
							:show-space-label="showSpaceLabel"
							@click="$emit('task-click', task)"
							@complete="$emit('complete', task.id)"
							@toggle-select="$emit('toggle-task-select', task.id)"
							@request-delete="$emit('request-task-delete', task.id)" />
					</div>
				</div>
			</div>
		</template>
	</section>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { computed } from 'vue'

	import { getProjectMotionPhaseDelay, useMotionPreset, withMotionDelay } from '@/composables/base/motion'
	import DraggableTaskList from '@/components/DraggableTaskList.vue'
	import EmptyState from '@/components/EmptyState.vue'
	import InlineTaskCreator from '@/components/InlineTaskCreator.vue'
	import TaskCard from '@/components/TaskCard'
	import TaskStatusIcon from '@/components/TaskStatusIcon.vue'
	import type { TaskDto } from '@/services/api/tasks'
	const { t } = useI18n({ useScope: 'global' })

	const props = defineProps<{
		title: string
		columnStatus?: 'todo' | 'done'
		tasks: TaskDto[]
		loading: boolean
		emptyText: string
		/** 优先级标识，用于限制拖拽范围。如果不传则允许组内任意拖拽 */
		priority?: string
		showCompleteButton?: boolean
		showTime?: boolean
		showSpaceLabel?: boolean
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
	const doneTaskItemMotion = useMotionPreset('listItem')
	const columnSectionMotion = useMotionPreset('listItem')
	const todoHeaderDelay = getProjectMotionPhaseDelay('columnTodoHeader')
	const doneHeaderDelay = getProjectMotionPhaseDelay('columnDoneHeader')
	const todoInlineDelay = getProjectMotionPhaseDelay('columnTodoInline')
	const todoEmptyDelay = getProjectMotionPhaseDelay('columnTodoEmpty')
	const doneEmptyDelay = getProjectMotionPhaseDelay('columnDoneEmpty')
	const todoListBaseDelay = getProjectMotionPhaseDelay('listTodoBase')
	const doneListBaseDelay = getProjectMotionPhaseDelay('listDoneBase')
	const doneListStep = getProjectMotionPhaseDelay('listStep')
	const doneListMax = getProjectMotionPhaseDelay('listMax')
	const priorityGroupStep = 14

	const selectedCount = computed(() => {
		if (!props.selectedTaskIdSet) return 0
		return props.tasks.reduce((acc, t) => acc + (props.selectedTaskIdSet?.has(t.id) ? 1 : 0), 0)
	})

	const allSelected = computed(() => props.tasks.length > 0 && selectedCount.value === props.tasks.length)
	const indeterminate = computed(() => selectedCount.value > 0 && !allSelected.value)
	const columnStatusValue = computed(() => props.columnStatus ?? 'todo')
	const isDoneColumn = computed(() => columnStatusValue.value === 'done')
	const columnHeaderMotion = computed(() => {
		const delay = isDoneColumn.value ? doneHeaderDelay : todoHeaderDelay
		return withMotionDelay(columnSectionMotion.value, delay)
	})
	const emptyStateMotion = computed(() => {
		const delay = isDoneColumn.value ? doneEmptyDelay : todoEmptyDelay
		return withMotionDelay(
			{
				initial: { opacity: 1 },
				enter: { opacity: 1 },
				leave: { opacity: 0 },
			},
			delay,
		)
	})

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

	const doneTasks = computed(() => {
		if (!isDoneColumn.value) return []
		return [...props.tasks].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
	})

	const doneTaskMotions = computed(() => {
		const base = doneTaskItemMotion.value
		return doneTasks.value.map((_task, index) => {
			const delay = Math.min(doneListBaseDelay + index * doneListStep, doneListMax)
			return withMotionDelay(base, delay)
		})
	})

	function isTaskSelected(taskId: string) {
		return props.selectedTaskIdSet?.has(taskId) ?? false
	}
</script>
