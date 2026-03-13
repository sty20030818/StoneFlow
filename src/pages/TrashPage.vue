<template>
	<div class="space-y-6">
		<div
			v-if="loading"
			v-motion="loadingMotion"
			class="text-sm text-muted">
			{{ t('common.status.loading') }}...
		</div>

		<div
			v-else
			v-motion="contentMotion">
			<div v-if="viewMode === 'projects'">
				<div
					v-if="deletedProjects.length === 0"
					class="text-[12px] text-muted px-3 py-2 rounded-md bg-elevated/60 border border-dashed border-default/70">
					{{ t('trash.empty.projects') }}
				</div>
				<div
					v-else
					class="space-y-2">
					<div
						v-for="project in deletedProjects"
						:key="project.id"
						v-motion="getProjectItemMotion(project.id)"
						class="flex items-center justify-between gap-4 rounded-xl border border-default/70 bg-default/70 px-4 py-3">
						<div class="min-w-0 space-y-0.5">
							<div class="text-sm font-semibold text-default truncate">{{ project.title }}</div>
							<div class="text-xs text-muted truncate">{{ project.path }}</div>
						</div>
						<div class="flex items-center gap-3">
							<TimeDisplay
								:timestamp="project.deletedAt"
								text-class="text-muted" />
							<UButton
								color="neutral"
								variant="soft"
								size="xs"
								:loading="restoringProjectIds.has(project.id)"
								@click="restoreProjectItem(project)">
								{{ t('common.actions.restore') }}
							</UButton>
						</div>
					</div>
				</div>
			</div>

			<div v-else>
				<div
					v-if="deletedTasks.length === 0"
					class="text-[12px] text-muted px-3 py-2 rounded-md bg-elevated/60 border border-dashed border-default/70">
					{{ t('trash.empty.tasks') }}
				</div>
				<div
					v-else
					class="space-y-2">
					<div
						v-for="task in deletedTasks"
						:key="task.id"
						v-motion="getTaskItemMotion(task.id)"
						class="flex items-center justify-between gap-4 rounded-xl border border-default/70 bg-default/70 px-4 py-3">
						<div class="min-w-0 space-y-0.5">
							<div class="text-sm font-semibold text-default truncate">{{ task.title }}</div>
							<div class="text-xs text-muted truncate">{{ getTaskProjectLabel(task.projectId) }}</div>
						</div>
						<div class="flex items-center gap-3">
							<TimeDisplay
								:timestamp="task.deletedAt"
								text-class="text-muted" />
							<UButton
								color="neutral"
								variant="soft"
								size="xs"
								:loading="restoringTaskIds.has(task.id)"
								@click="restoreTaskItem(task)">
								{{ t('common.actions.restore') }}
							</UButton>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { useRouteMetaShellBreadcrumb } from '@/app/shell-header'
	import TimeDisplay from '@/components/shared/TimeDisplay.vue'
	import { useTrashPageFacade } from '@/features/trash'

	useRouteMetaShellBreadcrumb('trash-page')

	const {
		t,
		loadingMotion,
		contentMotion,
		viewMode,
		loading,
		deletedProjects,
		deletedTasks,
		restoringProjectIds,
		restoringTaskIds,
		getTaskProjectLabel,
		restoreProjectItem,
		restoreTaskItem,
		getProjectItemMotion,
		getTaskItemMotion,
	} = useTrashPageFacade()
</script>
