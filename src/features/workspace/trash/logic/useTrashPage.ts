import { refDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { getUnknownProjectLabel } from '@/shared/config/project'
import { invalidateWorkspaceTaskAndProjectQueries, useSpaceProjectsState } from '@/features/workspace'
import { useSettingsStore } from '@/app/stores/settings'
import { resolveErrorMessage } from '@/shared/lib/error-message'

import type { TrashProject, TrashTask } from '../model'
import { restoreTrashProject, restoreTrashTasks } from '../mutations'
import { listTrashDeletedProjects, listTrashDeletedTasks } from '../queries'
import { useTrashViewMode } from './useTrashViewMode'

export function useTrashPage() {
	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })
	const settingsStore = useSettingsStore()

	const viewMode = useTrashViewMode()
	const loading = ref(true)
	const deletedProjects = ref<TrashProject[]>([])
	const deletedTasks = ref<TrashTask[]>([])
	const restoringProjectIds = ref<Set<string>>(new Set())
	const restoringTaskIds = ref<Set<string>>(new Set())

	const activeSpaceId = computed(() => settingsStore.settings.activeSpaceId ?? 'work')
	const scopeKey = computed(() => activeSpaceId.value)
	const debouncedScopeKey = refDebounced(scopeKey, 80)
	const projectsState = useSpaceProjectsState(activeSpaceId)

	const projectNameMap = computed(() => {
		const map = new Map<string, string>()
		for (const project of projectsState.projects.value) {
			map.set(project.id, project.title)
		}
		for (const project of deletedProjects.value) {
			map.set(project.id, project.title)
		}
		return map
	})

	function getTaskProjectLabel(projectId: string | null) {
		if (!projectId) return getUnknownProjectLabel()
		return projectNameMap.value.get(projectId) ?? t('trash.labels.deletedProject')
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

	async function refreshTrash() {
		const spaceId = scopeKey.value
		loading.value = true
		try {
			const [projects, tasks] = await withTimeout(
				Promise.all([listTrashDeletedProjects(spaceId), listTrashDeletedTasks(spaceId)]),
			)
			deletedProjects.value = projects
			deletedTasks.value = tasks
		} catch (error) {
			toast.add({
				title: t('trash.toast.loadFailedTitle'),
				description: resolveErrorMessage(error, t),
				color: 'error',
			})
		} finally {
			loading.value = false
		}
	}

	async function restoreProjectItem(project: TrashProject) {
		if (restoringProjectIds.value.has(project.id)) return
		const next = new Set(restoringProjectIds.value)
		next.add(project.id)
		restoringProjectIds.value = next
		try {
			await restoreTrashProject(project.id)
			deletedProjects.value = deletedProjects.value.filter((item) => item.id !== project.id)
			await invalidateWorkspaceTaskAndProjectQueries()
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

	async function restoreTaskItem(task: TrashTask) {
		if (restoringTaskIds.value.has(task.id)) return
		const next = new Set(restoringTaskIds.value)
		next.add(task.id)
		restoringTaskIds.value = next
		try {
			await restoreTrashTasks([task.id])
			deletedTasks.value = deletedTasks.value.filter((item) => item.id !== task.id)
			await invalidateWorkspaceTaskAndProjectQueries()
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
		() => {
			deletedProjects.value = []
			deletedTasks.value = []
			void refreshTrash()
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
		getTaskProjectLabel,
		restoreProjectItem,
		restoreTaskItem,
	}
}
