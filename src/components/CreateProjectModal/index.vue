<template>
	<UModal
		v-model:open="isOpen"
		title="New Project"
		description="创建一个新的项目容器"
		:ui="projectModalUi">
		<template #body>
			<div v-motion="modalBodyMotionPreset">
				<ProjectModalBody
					v-model:form="form"
					v-model:tag-input="tagInput"
					:space-options="spaceOptions"
					:parent-options="currentParentProjectOptions"
					:priority-options="priorityOptions"
					:link-kind-options="linkKindOptions"
					:project-root-label="projectRootLabel"
					@submit="handleSubmit"
					@add-tag="addTag"
					@remove-tag="removeTag"
					@add-link="addLink"
					@remove-link="removeLink" />
			</div>
		</template>

		<template #footer>
			<div v-motion="modalFooterMotionPreset">
				<ProjectModalFooter
					:loading="loading"
					:can-submit="canSubmit"
					@close="close"
					@submit="handleSubmit" />
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import ProjectModalBody from './components/ProjectModalBody.vue'
	import ProjectModalFooter from './components/ProjectModalFooter.vue'
	import { useMotionPreset, useMotionPresetWithDelay } from '@/composables/base/motion'
	import { createModalLayerUi } from '@/config/ui-layer'
	import {
		useCreateProjectModal,
		type CreateProjectModalEmits,
		type CreateProjectModalProps,
	} from './composables/useCreateProjectModal'

	const props = defineProps<CreateProjectModalProps>()
	const emit = defineEmits<CreateProjectModalEmits>()
	const modalBodyMotionPreset = useMotionPreset('modalSection')
	const modalFooterMotionPreset = useMotionPresetWithDelay('statusFeedback', 20)
	const projectModalUi = createModalLayerUi({
		width: 'sm:max-w-2xl',
		rounded: 'rounded-2xl',
	})

	const {
		isOpen,
		form,
		tagInput,
		loading,
		canSubmit,
		spaceOptions,
		priorityOptions,
		linkKindOptions,
		currentParentProjectOptions,
		projectRootLabel,
		addTag,
		removeTag,
		addLink,
		removeLink,
		handleSubmit,
		close,
	} = useCreateProjectModal(props, emit)
</script>
