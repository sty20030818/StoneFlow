<template>
	<VueDraggable
		v-model="localTasks"
		:group="groupConfig"
		:animation="150"
		:disabled="disabled"
		:force-fallback="true"
		chosen-class="cursor-grabbing"
		fallback-class="cursor-grabbing"
		class="flex flex-col gap-3 min-h-[40px]"
		ghost-class="opacity-50"
		drag-class="shadow-lg"
		filter=".no-drag"
		:prevent-on-filter="true"
		@end="onDragEnd">
		<TaskCard
			v-for="task in localTasks"
			:key="task.id"
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
	</VueDraggable>
</template>

<script setup lang="ts">
	import type { SortableEvent } from 'sortablejs'
	import { computed, ref, watch } from 'vue'
	import { VueDraggable } from 'vue-draggable-plus'

	import TaskCard from '@/components/TaskCard'
	import { rebalanceRanks, reorderTask, type TaskDto } from '@/services/api/tasks'
	import { calculateInsertRank } from '@/utils/rank'

	const props = defineProps<{
		tasks: TaskDto[]
		priority: string
		disabled?: boolean
		isEditMode?: boolean
		selectedTaskIdSet?: Set<string>
		showCompleteButton?: boolean
		showTime?: boolean
		showSpaceLabel?: boolean
	}>()

	const emit = defineEmits<{
		complete: [taskId: string]
		'task-click': [task: TaskDto]
		'toggle-task-select': [taskId: string]
		'request-task-delete': [taskId: string]
		/** 拖拽结束后触发，传递更新后的任务列表用于同步状态 */
		reorder: [tasks: TaskDto[]]
	}>()

	// 本地任务列表副本，用于拖拽
	const localTasks = ref<TaskDto[]>([])

	/**
	 * 同步 props 到本地
	 * 只在任务 ID 集合变化时同步（新增/删除），避免拖拽后的顺序被覆盖
	 */
	watch(
		() => props.tasks,
		(newTasks) => {
			const oldIds = new Set(localTasks.value.map((t) => t.id))
			const newIds = new Set(newTasks.map((t) => t.id))

			// ID 集合相同，说明只是顺序或属性变化，不需要重新同步
			// （拖拽后后端返回的数据可能是旧顺序，我们保留本地顺序）
			if (oldIds.size === newIds.size && [...oldIds].every((id) => newIds.has(id))) {
				// 更新已有任务的非 rank 属性（如 title、status 等）
				const newTaskMap = new Map(newTasks.map((t) => [t.id, t]))
				localTasks.value = localTasks.value.map((localTask) => {
					const newTask = newTaskMap.get(localTask.id)
					if (newTask) {
						// 保留本地 rank，更新其他属性
						return { ...newTask, rank: localTask.rank }
					}
					return localTask
				})
				return
			}

			// ID 集合变化，完全重新同步（按 rank 排序）
			localTasks.value = [...newTasks].sort((a, b) => a.rank - b.rank)
		},
		{ immediate: true, deep: true },
	)

	// sortablejs group 配置：同一优先级内可自由拖拽排序
	// 使用字符串 group name，sortablejs 会自动允许同 group 内重排
	const groupConfig = computed(() => `priority-${props.priority}`)

	function isTaskSelected(taskId: string) {
		return props.selectedTaskIdSet?.has(taskId) ?? false
	}

	async function onDragEnd(evt: SortableEvent) {
		const oldIndex = evt.oldIndex
		const newIndex = evt.newIndex

		if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return

		const tasks = localTasks.value
		const movedTask = tasks[newIndex]

		// 计算相邻任务的 rank
		const prevRank = newIndex > 0 ? tasks[newIndex - 1].rank : null
		const nextRank = newIndex < tasks.length - 1 ? tasks[newIndex + 1].rank : null

		const { newRank, needsRebalance } = calculateInsertRank(prevRank, nextRank)

		// 更新本地状态
		movedTask.rank = newRank

		// 通知父组件更新状态
		emit('reorder', [...localTasks.value])

		try {
			// 立即更新被拖拽任务的 rank
			await reorderTask(movedTask.id, newRank)

			// 如果需要重排，后台异步执行
			if (needsRebalance) {
				const taskIds = tasks.map((t) => t.id)
				// 不 await，让重排在后台执行
				rebalanceRanks(taskIds).catch(console.error)
			}
		} catch (error) {
			console.error('Failed to reorder task:', error)
		}
	}
</script>
