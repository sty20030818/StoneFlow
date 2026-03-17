<template>
	<div class="space-y-2">
		<!-- Project Header Card（仅在 project 模式下显示） -->
		<div
			v-if="currentProject"
			v-motion="projectHeaderMotion">
			<ProjectHeaderCard
				:project="currentProject"
				@open-settings="openProjectSettings" />
		</div>

		<div
			v-if="showLoadErrorState"
			v-motion="workspaceColumnsMotion">
			<EmptyState
				:text="t('projectView.toast.loadFailedTitle')"
				icon="i-lucide-triangle-alert"
				stacked
				class="bg-elevated/40">
				<p>{{ loadErrorMessage }}</p>
				<UButton
					class="mt-3"
					color="neutral"
					variant="soft"
					size="sm"
					icon="i-lucide-rotate-cw"
					@click="refresh">
					{{ t('common.actions.retry') }}
				</UButton>
			</EmptyState>
		</div>

		<div
			v-else
			v-motion="workspaceColumnsMotion">
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
	import { useProjectContentMotionPreset } from '@/composables/base/motion'
	import EmptyState from '@/components/base/EmptyState.vue'
	import { createModalLayerUi } from '@/config/ui-layer'
	import { ProjectHeaderCard, TaskColumn, useWorkspaceProjectView, WorkspaceLayout } from '@/features/workspace'

	const { t } = useI18n({ useScope: 'global' })
	const deleteModalUi = createModalLayerUi({
		width: 'sm:max-w-lg',
	})
	const projectHeaderMotion = useProjectContentMotionPreset('drawerSection', 'headerBreadcrumb')
	const workspaceColumnsMotion = useProjectContentMotionPreset('drawerSection', 'headerActions')
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
		loadErrorMessage,
		loading,
		onComplete,
		onCreateTaskRequest,
		onTaskClick,
		openProjectSettings,
		projectId,
		refresh,
		requestDeleteTask,
		selectedTaskIds,
		showSpaceLabel,
		showLoadErrorState,
		taskSpaceId,
		todo,
		toggleColumnSelect,
		toggleTaskSelect,
	} = useWorkspaceProjectView()
</script>
