<template>
	<UModal
		v-model:open="isOpen"
		title="New Task"
		description="快速创建一个新任务"
		:ui="{
			width: 'sm:max-w-2xl',
			rounded: 'rounded-2xl',
		}">
		<template #body>
			<TaskModalBody
				v-model:form="form"
				v-model:tag-input="tagInput"
				:space-options="spaceOptions"
				:project-options="projectOptions"
				:status-options="statusOptionsArray"
				:priority-options="priorityOptions"
				:done-reason-options="doneReasonOptions"
				:uncategorized-label="uncategorizedLabel"
				@submit="handleSubmit"
				@add-tag="addTag"
				@remove-tag="removeTag" />
		</template>

		<template #footer>
			<TaskModalFooter
				:loading="loading"
				:can-submit="canSubmit"
				@close="close"
				@submit="handleSubmit" />
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import TaskModalBody from './components/TaskModalBody.vue'
	import TaskModalFooter from './components/TaskModalFooter.vue'
	import { useCreateTaskModal, type CreateTaskModalEmits, type CreateTaskModalProps } from './composables/useCreateTaskModal'

	const props = defineProps<CreateTaskModalProps>()
	const emit = defineEmits<CreateTaskModalEmits>()

	const {
		isOpen,
		form,
		tagInput,
		loading,
		canSubmit,
		spaceOptions,
		projectOptions,
		statusOptionsArray,
		priorityOptions,
		doneReasonOptions,
		uncategorizedLabel,
		addTag,
		removeTag,
		handleSubmit,
		close,
	} = useCreateTaskModal(props, emit)
</script>
