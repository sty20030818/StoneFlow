<template>
	<TaskCardActive
		v-if="displayStatus === 'todo'"
		:task="task"
		:show-space-label="showSpaceLabel"
		:is-edit-mode="isEditMode"
		:selected="selected"
		:select-ring-class="selectRingClass"
		:on-toggle-select="onToggleSelect"
		:on-card-click="onCardClick"
		:on-request-delete="onRequestDelete"
		:on-complete="onComplete"
		:format-relative-time="formatRelativeTime"
		:format-absolute-time="formatAbsoluteTime" />
	<TaskCardDone
		v-else
		:task="task"
		:is-edit-mode="isEditMode"
		:selected="selected"
		:show-time="showTime"
		:is-cancelled="isCancelled"
		:done-reason-style="doneReasonStyle"
		:select-ring-class="selectRingClass"
		:on-toggle-select="onToggleSelect"
		:on-card-click="onCardClick"
		:on-request-delete="onRequestDelete"
		:format-absolute-time="formatAbsoluteTime" />
</template>

<script setup lang="ts">
	import TaskCardActive from './components/TaskCardActive.vue'
	import TaskCardDone from './components/TaskCardDone.vue'
	import { useTaskCard, type TaskCardEmits, type TaskCardProps } from './composables/useTaskCard'

	const props = defineProps<TaskCardProps>()
	const emit = defineEmits<TaskCardEmits>()

	const {
		displayStatus,
		isCancelled,
		doneReasonStyle,
		selectRingClass,
		onToggleSelect,
		onCardClick,
		onRequestDelete,
		onComplete,
		formatRelativeTime,
		formatAbsoluteTime,
	} = useTaskCard(props, emit)
</script>
