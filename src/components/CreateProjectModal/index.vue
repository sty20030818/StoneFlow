<template>
	<UModal
		v-model:open="isOpen"
		title="New Project"
		description="创建一个新的项目容器"
		:ui="{
			width: 'sm:max-w-2xl',
			rounded: 'rounded-2xl',
		}">
		<template #body>
			<ProjectModalBody
				v-model:form="form"
				:space-options="spaceOptions"
				:parent-options="currentParentProjectOptions"
				:priority-options="priorityOptions"
				:project-root-label="projectRootLabel"
				@submit="handleSubmit" />
		</template>

		<template #footer>
			<ProjectModalFooter
				:loading="loading"
				:can-submit="canSubmit"
				@close="close"
				@submit="handleSubmit" />
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import ProjectModalBody from './components/ProjectModalBody.vue'
	import ProjectModalFooter from './components/ProjectModalFooter.vue'
	import {
		useCreateProjectModal,
		type CreateProjectModalEmits,
		type CreateProjectModalProps,
	} from './composables/useCreateProjectModal'

	const props = defineProps<CreateProjectModalProps>()
	const emit = defineEmits<CreateProjectModalEmits>()

	const {
		isOpen,
		form,
		loading,
		canSubmit,
		spaceOptions,
		priorityOptions,
		currentParentProjectOptions,
		projectRootLabel,
		handleSubmit,
		close,
	} = useCreateProjectModal(props, emit)
</script>
