import { refDebounced, useStorage } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { invalidateWorkspaceTaskAndProjectQueries } from '@/features/workspace/model'
import { useProjectsStore } from '@/stores/projects'
import { useSettingsStore } from '@/stores/settings'
import { resolveErrorMessage } from '@/utils/error-message'

import type { TrashProjectDto, TrashTaskDto } from '../model'
import { restoreTrashProject, restoreTrashTasks } from '../mutations'
import { listTrashDeletedProjects, listTrashDeletedTasks } from '../queries'

type TrashSnapshot = {
	projects: TrashProjectDto[]
	tasks: TrashTaskDto[]
}

export function useTrashPage() {
	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })
	const settingsStore = useSettingsStore()
	const projectsStore = useProjectsStore()

	const viewMode = ref<'projects' | 'tasks'>('projects')
	const loading = ref(true)
	const deletedProjects = ref<TrashProjectDto[]>([])
	const deletedTasks = ref<TrashTaskDto[]>([])
	const restoringProjectIds = ref<Set<string>>(new Set())
	const restoringTaskIds = ref<Set<string>>(new Set())
	const trashSnapshots = useStorage<Record<string, TrashSnapshot>>('trash_snapshot_v1', {})
	const loadedTrashScopes = ref(new Set<string>())

	const activeSpaceId = computed(() => settingsStore.settings.activeSpaceId ?? 'work')
	const scopeKey = computed(() => activeSpaceId.value)
	const debouncedScopeKey = refDebounced(scopeKey, 80)

	const projectNameMap = computed(() => {
		const map = new Map<string, string>()
		for (const project of projectsStore.getProjectsOfSpace(activeSpaceId.value)) {
			map.set(project.id, project.title)
		}
		for (const project of deletedProjects.value) {
			map.set(project.id, project.title)
		}
		return map
	})

	function onViewModeChange(value: string | number) {
		if (value === 'projects' || value === 'tasks') viewMode.value = value
	}

	function getTaskProjectLabel(projectId: string | null) {
		if (!projectId) return t('common.labels.uncategorized')
		return projectNameMap.value.get(projectId) ?? t('trash.labels.deletedProject')
	}

	function writeSnapshot(spaceId: string, projects: TrashProjectDto[], tasks: TrashTaskDto[]) {
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
				Promise.all([listTrashDeletedProjects(spaceId), listTrashDeletedTasks(spaceId)]),
			)
			deletedProjects.value = projects
			deletedTasks.value = tasks
			writeSnapshot(spaceId, projects, tasks)
		} catch (error) {
			toast.add({
				title: t('trash.toast.loadFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
		} finally {
			markScopeLoaded(spaceId)
			if (!useSilent) loading.value = false
		}
	}

	async function restoreProjectItem(project: TrashProjectDto) {
		if (restoringProjectIds.value.has(project.id)) return
		const next = new Set(restoringProjectIds.value)
		next.add(project.id)
		restoringProjectIds.value = next
		try {
			await restoreTrashProject(project.id)
			deletedProjects.value = deletedProjects.value.filter((item) => item.id !== project.id)
			await invalidateWorkspaceTaskAndProjectQueries()
			refreshCurrentSnapshot()
			toast.add({
				title: t('trash.toast.projectRestoredTitle'),
				description: project.title,
				color: 'success',
			})
		} catch (error) {
			toast.add({
				title: t('trash.toast.restoreFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
		} finally {
			const restored = new Set(restoringProjectIds.value)
			restored.delete(project.id)
			restoringProjectIds.value = restored
		}
	}

	async function restoreTaskItem(task: TrashTaskDto) {
		if (restoringTaskIds.value.has(task.id)) return
		const next = new Set(restoringTaskIds.value)
		next.add(task.id)
		restoringTaskIds.value = next
		try {
			await restoreTrashTasks([task.id])
			deletedTasks.value = deletedTasks.value.filter((item) => item.id !== task.id)
			await invalidateWorkspaceTaskAndProjectQueries()
			refreshCurrentSnapshot()
			toast.add({
				title: t('trash.toast.taskRestoredTitle'),
				description: task.title,
				color: 'success',
			})
		} catch (error) {
			toast.add({
				title: t('trash.toast.restoreFailedTitle'),
				description: resolveErrorMessage(error, t),
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

	return {
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
	}
}
