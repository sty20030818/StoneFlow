import { useI18n } from 'vue-i18n'
import { computed, type Ref } from 'vue'

import { TASK_PRIORITY_OPTIONS, TASK_PRIORITY_STYLES } from '@/config/task'
import type { TaskDto } from '@/services/api/tasks'
import type { useProjectsStore } from '@/stores/projects'
import {
	normalizeDrawerSpaceKey,
	resolveDrawerSpaceDisplay,
	useDrawerSaveStatePresentation,
} from '@/components/InspectorDrawer/shared/composables'

import type { TaskInspectorState } from './useTaskInspectorState'

function getDefaultProject<T extends { id: string }>(projects: T[]): T | undefined {
	return projects.find((project) => project.id.endsWith('_default'))
}

function normalizePriorityKey(priority: string | null | undefined): keyof typeof TASK_PRIORITY_STYLES {
	const normalized = priority?.trim().toUpperCase() ?? ''
	if (normalized === 'P0' || normalized === 'P1' || normalized === 'P2' || normalized === 'P3') {
		return normalized
	}
	return 'default'
}

export function useTaskInspectorDerived(params: {
	currentTask: Ref<TaskDto | null>
	state: TaskInspectorState
	projectsStore: ReturnType<typeof useProjectsStore>
}) {
	const { currentTask, state, projectsStore } = params
	const { t, locale } = useI18n({ useScope: 'global' })
	const { saveStateLabel, saveStateClass, saveStateDotClass } = useDrawerSaveStatePresentation(state.saveState)

	const priorityLabel = computed(() => {
		const opt = TASK_PRIORITY_OPTIONS.find((item) => item.value === state.priorityLocal.value)
		return opt ? opt.label : t('inspector.attribute.notSet')
	})

	const priorityIcon = computed(() => {
		const opt = TASK_PRIORITY_OPTIONS.find((item) => item.value === state.priorityLocal.value)
		return opt?.icon ?? TASK_PRIORITY_OPTIONS[0]?.icon ?? 'i-lucide-alert-triangle'
	})

	const priorityStyle = computed(() => {
		const key = normalizePriorityKey(state.priorityLocal.value)
		return TASK_PRIORITY_STYLES[key]
	})

	const priorityCardClass = computed(() => {
		return priorityStyle.value.cardClass
	})

	const priorityIconClass = computed(() => {
		return priorityStyle.value.iconClass
	})

	const priorityTextClass = computed(() => {
		return priorityStyle.value.textClass
	})

	const spaceCardClass = computed(() => {
		return resolveDrawerSpaceDisplay(state.spaceIdLocal.value).cardClass
	})

	const spaceCardLabelClass = computed(() => {
		return resolveDrawerSpaceDisplay(state.spaceIdLocal.value).cardLabelClass
	})

	const spaceCardValueClass = computed(() => {
		return resolveDrawerSpaceDisplay(state.spaceIdLocal.value).cardValueClass
	})

	const currentProjectLabel = computed(() => {
		const projects = projectsStore.getProjectsOfSpace(state.spaceIdLocal.value)
		const defaultProject = getDefaultProject(projects)
		if (!state.projectIdLocal.value) return defaultProject?.title ?? t('common.labels.unknownProject')
		const proj = projects.find((p) => p.id === state.projectIdLocal.value)
		return proj?.title ?? defaultProject?.title ?? t('common.labels.unknownProject')
	})

	const deadlineLabel = computed(() => {
		if (!state.deadlineLocal.value) return t('inspector.attribute.notSet')
		const date = new Date(state.deadlineLocal.value)
		return date.toLocaleDateString(locale.value, {
			month: 'short',
			day: 'numeric',
		})
	})

	const currentSpaceLabel = computed(() => {
		const spaceId = currentTask.value?.spaceId
		const key = normalizeDrawerSpaceKey(spaceId)
		if (!key) return spaceId ?? resolveDrawerSpaceDisplay(spaceId).label
		return resolveDrawerSpaceDisplay(spaceId).label
	})

	const currentSpaceIcon = computed(() => {
		return resolveDrawerSpaceDisplay(currentTask.value?.spaceId).icon
	})

	const spacePillClass = computed(() => {
		return resolveDrawerSpaceDisplay(currentTask.value?.spaceId).pillClass
	})

	const projectPath = computed(() => {
		const task = currentTask.value
		if (!task) return t('common.labels.unknownProject')
		const projects = projectsStore.getProjectsOfSpace(task.spaceId)
		const defaultProject = getDefaultProject(projects)
		const project = task.projectId ? projects.find((p) => p.id === task.projectId) : defaultProject
		if (!project) return t('common.labels.unknownProject')
		return project.path || project.title
	})

	const projectTrail = computed(() => {
		const raw = projectPath.value?.trim()
		if (!raw) return []
		if (raw === t('common.labels.unknownProject')) return [raw]
		const parts = raw
			.split('/')
			.map((item: string) => item.trim())
			.filter(Boolean)
		return parts.length ? parts : [raw]
	})

	return {
		priorityIcon,
		priorityLabel,
		priorityCardClass,
		priorityIconClass,
		priorityTextClass,
		spaceCardClass,
		spaceCardLabelClass,
		spaceCardValueClass,
		currentProjectLabel,
		deadlineLabel,
		currentSpaceLabel,
		currentSpaceIcon,
		spacePillClass,
		projectTrail,
		saveStateLabel,
		saveStateClass,
		saveStateDotClass,
	}
}
