<template>
	<!-- Todo 状态 -->
	<div
		v-if="displayStatus === 'todo'"
		class="relative bg-default rounded-2xl p-4 border border-default/70 hover:border-default/90 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex gap-4 items-start"
		:class="isEditMode && selected ? 'border-error/60 hover:border-error/70 bg-error/5 shadow-sm' : ''"
		@click="onCardClick">
		<div
			v-if="isEditMode && selected"
			class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-error/10"></div>
		<!-- 左侧：完成按钮或选择圈 -->
		<div class="mt-1">
			<button
				v-if="isEditMode"
				type="button"
				class="size-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
				:class="selectRingClass"
				@click.stop="onToggleSelect">
				<UIcon
					v-if="selected"
					name="i-lucide-x"
					class="size-3.5" />
			</button>
			<div
				v-else
				@click.stop="$emit('complete', task.id)"
				class="size-6 rounded-full border-2 border-blue-500/70 hover:border-blue-500 transition-colors shrink-0 cursor-pointer"></div>
		</div>

		<div class="flex-1 min-w-0">
			<div class="flex justify-between items-start">
				<span class="font-bold text-default text-base group-hover:text-default transition-colors">
					{{ task.title }}
				</span>
				<div class="flex items-center gap-2 shrink-0">
					<PriorityBadge
						:priority="task.priority"
						variant="todo" />
					<button
						v-if="isEditMode"
						type="button"
						class="inline-flex size-8 items-center justify-center rounded-full text-error transition-colors hover:bg-error/10"
						@click.stop="onRequestDelete">
						<UIcon
							name="i-lucide-trash-2"
							class="size-4" />
					</button>
				</div>
			</div>

			<p
				v-if="task.note"
				class="text-xs text-muted mt-1 line-clamp-1">
				{{ task.note }}
			</p>

			<div
				class="flex items-center gap-2 mt-3"
				v-if="showSpaceLabel || task.tags.length > 0 || task.deadline_at || (task.links?.length ?? 0) > 0">
				<SpaceLabel
					v-if="showSpaceLabel"
					:space-id="task.space_id" />
				<span
					v-for="tag in task.tags"
					:key="tag"
					class="text-[10px] font-bold text-muted bg-elevated px-1.5 py-0.5 rounded">
					#{{ tag }}
				</span>
				<div
					v-if="task.deadline_at"
					class="flex items-center gap-1 text-blue-600 text-[10px]">
					<UIcon
						name="i-lucide-calendar"
						class="size-3" />
					<span class="font-medium">
						{{ formatDueDate(task.deadline_at) }}
					</span>
				</div>
				<div
					v-if="(task.links?.length ?? 0) > 0"
					class="flex items-center gap-1 text-[10px] text-muted">
					<UIcon
						name="i-lucide-link-2"
						class="size-3" />
					<span class="font-medium">{{ task.links.length }}</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Done / Cancelled 状态 -->
	<div
		v-else
		class="relative flex items-center gap-4 p-4 bg-elevated rounded-2xl border border-transparent hover:border-default/80 transition-colors opacity-70 hover:opacity-100"
		:class="isEditMode && selected ? 'border-error/60 bg-error/5 opacity-100 shadow-sm' : ''"
		@click="onCardClick">
		<div
			v-if="isEditMode && selected"
			class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-error/10"></div>
		<div class="shrink-0">
			<button
				v-if="isEditMode"
				type="button"
				class="size-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
				:class="selectRingClass"
				@click.stop="onToggleSelect">
				<UIcon
					v-if="selected"
					name="i-lucide-x"
					class="size-3.5" />
			</button>
			<div
				v-else
				class="w-6 h-6 flex items-center justify-center rounded-full"
				:class="doneReasonStyle.ringClass">
				<UIcon
					:name="doneReasonStyle.icon"
					class="size-3" />
			</div>
		</div>
		<div class="flex items-center gap-2 min-w-0 flex-1">
			<span class="text-muted font-medium line-through">{{ task.title }}</span>
			<UBadge
				v-if="isCancelled"
				size="xs"
				color="error"
				variant="soft">
				{{ doneReasonStyle.badgeLabel }}
			</UBadge>
		</div>
		<div class="ml-auto flex items-center gap-2 shrink-0">
			<button
				v-if="isEditMode"
				type="button"
				class="inline-flex size-8 items-center justify-center rounded-full text-error transition-colors hover:bg-error/10"
				@click.stop="onRequestDelete">
				<UIcon
					name="i-lucide-trash-2"
					class="size-4" />
			</button>
			<div
				v-if="(task.links?.length ?? 0) > 0"
				class="flex items-center gap-1 text-[10px] text-muted">
				<UIcon
					name="i-lucide-link-2"
					class="size-3" />
				<span class="font-medium">{{ task.links.length }}</span>
			</div>
			<TimeDisplay
				v-if="showTime && task.completed_at"
				:timestamp="task.completed_at"
				text-class="text-xs text-muted" />
		</div>
	</div>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import PriorityBadge from '@/components/PriorityBadge.vue'
	import SpaceLabel from '@/components/SpaceLabel.vue'
	import TimeDisplay from '@/components/TimeDisplay.vue'
	import { TASK_DONE_REASON_CARD_STYLES, type TaskDoneReasonValue } from '@/config/task'
	import type { TaskDto } from '@/services/api/tasks'
	import { getDisplayStatus } from '@/utils/task'

	const props = defineProps<{
		task: TaskDto
		showCompleteButton?: boolean
		showTime?: boolean
		showSpaceLabel?: boolean
		isEditMode?: boolean
		selected?: boolean
	}>()

	const emit = defineEmits<{
		click: [task: TaskDto]
		complete: [taskId: string]
		'toggle-select': [taskId: string]
		'request-delete': [taskId: string]
	}>()

	const displayStatus = computed(() => getDisplayStatus(props.task.status))
	const isCancelled = computed(() => props.task.done_reason === 'cancelled')
	const doneReasonKey = computed<TaskDoneReasonValue>(() => (isCancelled.value ? 'cancelled' : 'completed'))
	const doneReasonStyle = computed(() => TASK_DONE_REASON_CARD_STYLES[doneReasonKey.value])

	const selectRingClass = computed(() => {
		if (props.selected) return 'border-error/70 bg-error/15 text-error shadow-sm'
		return 'border-default/60 bg-default hover:border-default text-transparent'
	})

	function onToggleSelect() {
		emit('toggle-select', props.task.id)
	}

	function onCardClick() {
		if (props.isEditMode) {
			onToggleSelect()
			return
		}
		emit('click', props.task)
	}

	function onRequestDelete() {
		if (!props.isEditMode) return
		emit('request-delete', props.task.id)
	}

	function formatDueDate(timestamp: number): string {
		const date = new Date(timestamp)
		const now = new Date()
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
		const dueDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
		const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

		if (diffDays === 0) return '今天'
		if (diffDays === 1) return '明天'
		if (diffDays === -1) return '昨天'
		if (diffDays > 0 && diffDays <= 7) return `${diffDays}天后`
		if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}天前`

		return date.toLocaleDateString('zh-CN', {
			month: 'short',
			day: 'numeric',
		})
	}
</script>
