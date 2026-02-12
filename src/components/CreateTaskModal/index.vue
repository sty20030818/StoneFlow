<template>
	<UModal
		v-model:open="isOpen"
		title="New Task"
		description="快速创建一个新任务"
		:ui="taskModalUi">
		<template #body>
			<div v-motion="modalBodyMotionPreset">
				<TaskModalBody
					v-model:form="form"
					v-model:tag-input="tagInput"
					:space-options="spaceOptions"
					:project-options="projectOptions"
					:status-options="statusOptionsArray"
					:priority-options="priorityOptions"
					:done-reason-options="doneReasonOptions"
					:link-kind-options="linkKindOptions"
					:advanced-open="advancedOpen"
					:uncategorized-label="uncategorizedLabel"
					@submit="handleSubmit"
					@toggle-advanced="toggleAdvanced()"
					@add-tag="addTag"
					@remove-tag="removeTag"
					@add-link="addLink"
					@remove-link="removeLink"
					@add-custom-field="addCustomField"
					@remove-custom-field="removeCustomField" />
			</div>
		</template>

		<template #footer>
			<div v-motion="modalFooterMotionPreset">
				<TaskModalFooter
					:loading="loading"
					:can-submit="canSubmit"
					@close="close"
					@submit="handleSubmit" />
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import TaskModalBody from './components/TaskModalBody.vue'
	import TaskModalFooter from './components/TaskModalFooter.vue'
	import { useMotionPreset, useMotionPresetWithDelay } from '@/composables/base/motion'
	import { createModalLayerUi } from '@/config/ui-layer'
	import {
		useCreateTaskModal,
		type CreateTaskModalEmits,
		type CreateTaskModalProps,
	} from './composables/useCreateTaskModal'

	const props = defineProps<CreateTaskModalProps>()
	const emit = defineEmits<CreateTaskModalEmits>()
	const modalBodyMotionPreset = useMotionPreset('modalSection')
	const modalFooterMotionPreset = useMotionPresetWithDelay('statusFeedback', 20)
	const taskModalUi = createModalLayerUi({
		width: 'sm:max-w-2xl',
		rounded: 'rounded-2xl',
	})

	const {
		isOpen,
		form,
		tagInput,
		advancedOpen,
		loading,
		canSubmit,
		spaceOptions,
		projectOptions,
		statusOptionsArray,
		priorityOptions,
		doneReasonOptions,
		linkKindOptions,
		uncategorizedLabel,
		toggleAdvanced,
		addTag,
		removeTag,
		addLink,
		removeLink,
		addCustomField,
		removeCustomField,
		handleSubmit,
		close,
	} = useCreateTaskModal(props, emit)
</script>
