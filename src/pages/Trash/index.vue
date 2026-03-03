<template>
	<div class="space-y-6">
		<Teleport
			defer
			to="#header-actions-portal">
			<UTabs
				v-motion="headerActionMotion"
				:items="viewTabItems"
				:model-value="viewMode"
				:content="false"
				color="neutral"
				variant="pill"
				size="sm"
				:ui="viewTabsUi"
				@update:model-value="onViewModeChange">
				<template #leading="{ item }">
					<UIcon
						:name="item.icon"
						class="size-3.5"
						:class="viewMode === item.value ? item.iconClass : 'text-muted'" />
				</template>
			</UTabs>
		</Teleport>

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
	import { computed } from 'vue'

	import { useAppMotionPreset, useMotionPreset, withMotionDelay } from '@/composables/base/motion'
	import TimeDisplay from '@/components/shared/TimeDisplay.vue'
	import { useTrashPage } from '@/features/trash'

	const headerActionMotion = useAppMotionPreset('statusFeedback', 'stateAction')
	const loadingMotion = useAppMotionPreset('statusFeedback', 'sectionBase', 8)
	const contentMotion = useAppMotionPreset('drawerSection', 'sectionBase', 20)
	const listItemMotion = useMotionPreset('listItem')
	const {
		t,
		viewMode,
		loading,
		deletedProjects,
		deletedTasks,
		restoringProjectIds,
		restoringTaskIds,
		onViewModeChange,
		getTaskProjectLabel,
		restoreProjectItem,
		restoreTaskItem,
	} = useTrashPage()

	const projectItemMotionCache = new Map<string, number>()
	const taskItemMotionCache = new Map<string, number>()

	const viewOptions = computed(() => [
		{
			value: 'projects' as const,
			label: t('trash.tabs.projects'),
			icon: 'i-lucide-folder',
			iconClass: 'text-emerald-600',
		},
		{
			value: 'tasks' as const,
			label: t('trash.tabs.tasks'),
			icon: 'i-lucide-list-checks',
			iconClass: 'text-pink-500',
		},
	])
	const viewTabsUi = {
		root: 'w-full',
		list: 'w-full rounded-full bg-elevated/70 border border-default/80 p-1 gap-1',
		trigger:
			'rounded-full px-3.5 py-1.5 text-[11px] font-semibold hover:data-[state=inactive]:bg-default/40 hover:data-[state=inactive]:text-default hover:data-[state=inactive]:shadow-sm data-[state=active]:text-default',
		leadingIcon: 'size-3.5',
		indicator: 'rounded-full shadow-sm bg-default inset-y-1',
	}
	const viewTabItems = computed(() =>
		viewOptions.value.map((opt) => ({
			label: opt.label,
			value: opt.value,
			icon: opt.icon,
			iconClass: opt.iconClass,
		})),
	)

	function getProjectItemMotion(projectId: string) {
		const cached = projectItemMotionCache.get(projectId)
		if (typeof cached === 'number') return withMotionDelay(listItemMotion.value, cached)
		const delay = 56 + projectItemMotionCache.size * 18
		projectItemMotionCache.set(projectId, delay)
		return withMotionDelay(listItemMotion.value, delay)
	}

	function getTaskItemMotion(taskId: string) {
		const cached = taskItemMotionCache.get(taskId)
		if (typeof cached === 'number') return withMotionDelay(listItemMotion.value, cached)
		const delay = 56 + taskItemMotionCache.size * 18
		taskItemMotionCache.set(taskId, delay)
		return withMotionDelay(listItemMotion.value, delay)
	}
</script>
