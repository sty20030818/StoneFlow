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
import { useI18n } from 'vue-i18n'
	import { refDebounced, useStorage, watchDebounced } from '@vueuse/core'
	import { computed, ref, watch } from 'vue'

	import { useAppMotionPreset, useMotionPreset, withMotionDelay } from '@/composables/base/motion'
	import TimeDisplay from '@/components/TimeDisplay.vue'
	import type { ProjectDto } from '@/services/api/projects'
	import { listDeletedProjects, restoreProject } from '@/services/api/projects'
	import type { TaskDto } from '@/services/api/tasks'
	import { listDeletedTasks, restoreTasks } from '@/services/api/tasks'
	import { useProjectsStore } from '@/stores/projects'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
	import { useSettingsStore } from '@/stores/settings'
	import { resolveErrorMessage } from '@/utils/error-message'

	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })
	const headerActionMotion = useAppMotionPreset('statusFeedback', 'stateAction')
	const loadingMotion = useAppMotionPreset('statusFeedback', 'sectionBase', 8)
	const contentMotion = useAppMotionPreset('drawerSection', 'sectionBase', 20)
	const listItemMotion = useMotionPreset('listItem')
	const settingsStore = useSettingsStore()
	const projectsStore = useProjectsStore()
	const refreshSignals = useRefreshSignalsStore()

	type TrashSnapshot = {
		projects: ProjectDto[]
		tasks: TaskDto[]
	}

	const viewMode = ref<'projects' | 'tasks'>('projects')
	const loading = ref(true)
	const deletedProjects = ref<ProjectDto[]>([])
	const deletedTasks = ref<TaskDto[]>([])
	const restoringProjectIds = ref<Set<string>>(new Set())
	const restoringTaskIds = ref<Set<string>>(new Set())
	const trashSnapshots = useStorage<Record<string, TrashSnapshot>>('trash_snapshot_v1', {})
	const loadedTrashScopes = ref(new Set<string>())
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

	const activeSpaceId = computed(() => settingsStore.settings.activeSpaceId ?? 'work')
	const scopeKey = computed(() => activeSpaceId.value)
	const debouncedScopeKey = refDebounced(scopeKey, 80)

	const projectNameMap = computed(() => {
		const map = new Map<string, string>()
		for (const p of projectsStore.getProjectsOfSpace(activeSpaceId.value)) {
			map.set(p.id, p.title)
		}
		for (const p of deletedProjects.value) {
			map.set(p.id, p.title)
		}
		return map
	})

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

	function onViewModeChange(value: string | number) {
		if (value === 'projects' || value === 'tasks') viewMode.value = value
	}
	function getTaskProjectLabel(projectId: string | null) {
		if (!projectId) return t('common.labels.uncategorized')
		return projectNameMap.value.get(projectId) ?? t('trash.labels.deletedProject')
	}

	function writeSnapshot(spaceId: string, projects: ProjectDto[], tasks: TaskDto[]) {
		trashSnapshots.value = {
			...trashSnapshots.value,
			[spaceId]: {
				projects,
				tasks,
			},
		}
	}

	function applySnapshot(spaceId: string): boolean {
		const snapshot = trashSnapshots.value[spaceId]
		if (!snapshot) return false
		deletedProjects.value = snapshot.projects
		deletedTasks.value = snapshot.tasks
		return true
	}

	function markScopeLoaded(spaceId: string) {
		loadedTrashScopes.value = new Set(loadedTrashScopes.value).add(spaceId)
	}

	function refreshCurrentSnapshot() {
		const spaceId = scopeKey.value
		writeSnapshot(spaceId, deletedProjects.value, deletedTasks.value)
	}

	async function withTimeout<T>(promise: Promise<T>, timeoutMs = 12000): Promise<T> {
		let timer: ReturnType<typeof setTimeout> | null = null
		const timeoutPromise = new Promise<never>((_, reject) => {
			timer = setTimeout(() => {
				reject(new Error(t('trash.toast.loadTimeout')))
			}, timeoutMs)
		})
		try {
			return await Promise.race([promise, timeoutPromise])
		} finally {
			if (timer) clearTimeout(timer)
		}
	}

	async function refreshTrash(silent = false) {
		const spaceId = scopeKey.value
		const useSilent = silent && loadedTrashScopes.value.has(spaceId)
		if (!useSilent) loading.value = true
		try {
			const [projects, tasks] = await withTimeout(
				Promise.all([listDeletedProjects({ spaceId }), listDeletedTasks({ spaceId })]),
			)
			deletedProjects.value = projects
			deletedTasks.value = tasks
			writeSnapshot(spaceId, projects, tasks)
		} catch (e) {
			toast.add({
				title: t('trash.toast.loadFailedTitle'),
				description: resolveErrorMessage(e, t),
				color: 'error',
			})
		} finally {
			markScopeLoaded(spaceId)
			if (!useSilent) loading.value = false
		}
	}

	async function restoreProjectItem(project: ProjectDto) {
		if (restoringProjectIds.value.has(project.id)) return
		const next = new Set(restoringProjectIds.value)
		next.add(project.id)
		restoringProjectIds.value = next
		try {
			await restoreProject(project.id)
			deletedProjects.value = deletedProjects.value.filter((p) => p.id !== project.id)
			refreshCurrentSnapshot()
			refreshSignals.bumpProject()
			toast.add({
				title: t('trash.toast.projectRestoredTitle'),
				description: project.title,
				color: 'success',
			})
		} catch (e) {
			toast.add({
				title: t('trash.toast.restoreFailedTitle'),
				description: resolveErrorMessage(e, t),
				color: 'error',
			})
		} finally {
			const restored = new Set(restoringProjectIds.value)
			restored.delete(project.id)
			restoringProjectIds.value = restored
		}
	}

	async function restoreTaskItem(task: TaskDto) {
		if (restoringTaskIds.value.has(task.id)) return
		const next = new Set(restoringTaskIds.value)
		next.add(task.id)
		restoringTaskIds.value = next
		try {
			await restoreTasks([task.id])
			deletedTasks.value = deletedTasks.value.filter((t) => t.id !== task.id)
			refreshCurrentSnapshot()
			refreshSignals.bumpTask()
			toast.add({
				title: t('trash.toast.taskRestoredTitle'),
				description: task.title,
				color: 'success',
			})
		} catch (e) {
			toast.add({
				title: t('trash.toast.restoreFailedTitle'),
				description: resolveErrorMessage(e, t),
				color: 'error',
			})
		} finally {
			const restored = new Set(restoringTaskIds.value)
			restored.delete(task.id)
			restoringTaskIds.value = restored
		}
	}

	watch(
		debouncedScopeKey,
		(nextScope) => {
			const hasSnapshot = applySnapshot(nextScope)
			if (hasSnapshot) {
				loading.value = false
				markScopeLoaded(nextScope)
				void refreshTrash(true)
				return
			}
			void refreshTrash(false)
		},
		{ immediate: true },
	)

	// 监听删除刷新信号：回收站停留期间，外部删除后自动可见。
	watchDebounced(
		() => [refreshSignals.projectTick, refreshSignals.taskTick] as const,
		() => {
			void refreshTrash(true)
		},
		{
			debounce: 80,
			maxWait: 200,
		},
	)
</script>
