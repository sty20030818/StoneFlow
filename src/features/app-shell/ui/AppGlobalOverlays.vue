<template>
	<slot />

	<UModal
		v-model:open="commandPaletteOpen"
		:title="t('commandPalette.title')"
		:description="t('commandPalette.description')"
		:ui="commandPaletteModalUi">
		<template #content>
			<UCommandPalette
				:groups="commandGroups"
				:placeholder="t('commandPalette.placeholder')"
				class="h-80"
				@update:model-value="onCommandSelect" />
		</template>
	</UModal>

	<CreateTaskModal
		v-model="createTaskModalOpen"
		:space-id="currentSpaceId"
		:project-id="currentRouteProjectId"
		:projects="currentProjects"
		@created="onTaskCreated" />

	<CreateProjectModal
		v-model="createProjectModalOpen"
		:space-id="createProjectModalSpaceId"
		:projects="currentProjects"
		@created="onProjectCreated" />

	<UpdateNotification />
</template>

<script setup lang="ts">
	import UpdateNotification from '@/components/UpdateNotification.vue'
	import { CreateProjectModal, CreateTaskModal } from '@/features/create-flow'

	import { useAppGlobalOverlays } from '../composables/useAppGlobalOverlays'

	const {
		commandPaletteOpen,
		createTaskModalOpen,
		createProjectModalOpen,
		createProjectModalSpaceId,
		commandPaletteModalUi,
		commandGroups,
		currentProjects,
		currentRouteProjectId,
		currentSpaceId,
		onCommandSelect,
		onTaskCreated,
		onProjectCreated,
		t,
	} = useAppGlobalOverlays()
</script>
