<template>
	<div class="space-y-8">
		<!-- Project Header Card（仅在 project 模式下显示） -->
		<div
			v-if="currentProject"
			v-motion="projectHeaderMotion">
			<ProjectHeaderCard
				:project="currentProject"
				@open-settings="openProjectSettings" />
		</div>

		<div v-motion="workspaceColumnsMotion">
			<WorkspaceLayout>
				<template #todo>
					<TaskColumn
						:title="t('projectView.columns.todo')"
						column-status="todo"
						:tasks="todo"
						:loading="loading"
						:empty-text="t('projectView.empty.todo')"
						:sticky-offset="columnStickyOffset"
						:reset-collapse-key="collapseResetKey"
						:show-complete-button="true"
						:show-space-label="showSpaceLabel"
						:show-inline-creator="true"
						:show-create-task-action="true"
						:space-id="taskSpaceId"
						:project-id="projectId"
						:is-edit-mode="isEditMode"
						:selected-task-id-set="selectedTaskIds"
						@complete="onComplete"
						@task-click="onTaskClick"
						@create-task="onCreateTaskRequest"
						@toggle-task-select="toggleTaskSelect"
						@toggle-column-select="() => toggleColumnSelect(todo)"
						@request-task-delete="requestDeleteTask" />
				</template>

				<template #done>
					<TaskColumn
						:title="t('projectView.columns.done')"
						column-status="done"
						:tasks="doneAll"
						:loading="loading"
						:empty-text="t('projectView.empty.done')"
						:sticky-offset="columnStickyOffset"
						:reset-collapse-key="collapseResetKey"
						:show-time="true"
						:show-space-label="showSpaceLabel"
						:is-edit-mode="isEditMode"
						:selected-task-id-set="selectedTaskIds"
						@task-click="onTaskClick"
						@toggle-task-select="toggleTaskSelect"
						@toggle-column-select="() => toggleColumnSelect(doneAll)"
						@request-task-delete="requestDeleteTask" />
				</template>
			</WorkspaceLayout>
		</div>

		<UModal
			v-model:open="confirmDeleteOpen"
			:title="t('projectView.deleteModal.title')"
			:description="t('projectView.deleteModal.description')"
			:ui="deleteModalUi">
			<template #body>
				<p class="text-sm text-muted">{{ t('projectView.deleteModal.body', { count: deleteCount }) }}</p>
			</template>
			<template #footer>
				<UButton
					color="neutral"
					variant="ghost"
					size="sm"
					@click="closeDeleteConfirm">
					{{ t('common.actions.cancel') }}
				</UButton>
				<UButton
					color="error"
					size="sm"
					:loading="deleting"
					:disabled="deleteCount === 0"
					@click="confirmDelete">
					{{ t('projectView.deleteModal.confirm') }}
				</UButton>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { useProjectMotionPreset } from '@/composables/base/motion'
	import { createModalLayerUi } from '@/config/ui-layer'
	import { TaskColumn, useWorkspaceProjectView } from '@/features/workspace'
	import ProjectHeaderCard from './partials/ProjectHeaderCard.vue'
	import WorkspaceLayout from './partials/WorkspaceLayout.vue'

	const { t } = useI18n({ useScope: 'global' })
	const deleteModalUi = createModalLayerUi({
		width: 'sm:max-w-lg',
	})
	const projectHeaderMotion = useProjectMotionPreset('drawerSection', 'headerBreadcrumb')
	const workspaceColumnsMotion = useProjectMotionPreset('drawerSection', 'headerActions')
	const {
		columnStickyOffset,
		collapseResetKey,
		confirmDelete,
		confirmDeleteOpen,
		closeDeleteConfirm,
		currentProject,
		deleteCount,
		doneAll,
		deleting,
		isEditMode,
		loading,
		onComplete,
		onCreateTaskRequest,
		onTaskClick,
		openProjectSettings,
		projectId,
		requestDeleteTask,
		selectedTaskIds,
		showSpaceLabel,
		taskSpaceId,
		todo,
		toggleColumnSelect,
		toggleTaskSelect,
	} = useWorkspaceProjectView()
</script>
