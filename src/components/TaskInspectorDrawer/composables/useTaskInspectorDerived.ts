import { computed, type Ref } from 'vue'

import { DEFAULT_SPACE_DISPLAY, SPACE_DISPLAY } from '@/config/space'
import { UNKNOWN_PROJECT_LABEL } from '@/config/project'
import { TASK_PRIORITY_OPTIONS, TASK_PRIORITY_STYLES } from '@/config/task'
import type { TaskDto } from '@/services/api/tasks'
import type { useProjectsStore } from '@/stores/projects'

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

function normalizeSpaceKey(spaceId: string | null | undefined): keyof typeof SPACE_DISPLAY | null {
	const normalized = spaceId?.trim().toLowerCase() ?? ''
	if (normalized === 'work' || normalized === 'personal' || normalized === 'study') {
		return normalized
	}
	return null
}

export function useTaskInspectorDerived(params: {
	currentTask: Ref<TaskDto | null>
	state: TaskInspectorState
	projectsStore: ReturnType<typeof useProjectsStore>
}) {
	const { currentTask, state, projectsStore } = params

	const priorityLabel = computed(() => {
		const opt = TASK_PRIORITY_OPTIONS.find((item) => item.value === state.priorityLocal.value)
		return opt ? opt.label : '未设定'
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
		const key = normalizeSpaceKey(state.spaceIdLocal.value)
		const display = key ? SPACE_DISPLAY[key] : null
		return display?.cardClass ?? DEFAULT_SPACE_DISPLAY.cardClass
	})

	const spaceCardLabelClass = computed(() => {
		const key = normalizeSpaceKey(state.spaceIdLocal.value)
		const display = key ? SPACE_DISPLAY[key] : null
		return display?.cardLabelClass ?? DEFAULT_SPACE_DISPLAY.cardLabelClass
	})

	const spaceCardValueClass = computed(() => {
		const key = normalizeSpaceKey(state.spaceIdLocal.value)
		const display = key ? SPACE_DISPLAY[key] : null
		return display?.cardValueClass ?? DEFAULT_SPACE_DISPLAY.cardValueClass
	})

	const currentProjectLabel = computed(() => {
		const projects = projectsStore.getProjectsOfSpace(state.spaceIdLocal.value)
		const defaultProject = getDefaultProject(projects)
		if (!state.projectIdLocal.value) return defaultProject?.title ?? UNKNOWN_PROJECT_LABEL
		const proj = projects.find((p) => p.id === state.projectIdLocal.value)
		return proj?.title ?? defaultProject?.title ?? UNKNOWN_PROJECT_LABEL
	})

	const deadlineLabel = computed(() => {
		if (!state.deadlineLocal.value) return '未设定'
		const date = new Date(state.deadlineLocal.value)
		return date.toLocaleDateString('zh-CN', {
			month: 'short',
			day: 'numeric',
		})
	})

	const currentSpaceLabel = computed(() => {
		const key = normalizeSpaceKey(currentTask.value?.spaceId)
		if (!key) return currentTask.value?.spaceId ?? DEFAULT_SPACE_DISPLAY.label
		return SPACE_DISPLAY[key].label
	})

	const currentSpaceIcon = computed(() => {
		const key = normalizeSpaceKey(currentTask.value?.spaceId)
		if (!key) return DEFAULT_SPACE_DISPLAY.icon
		return SPACE_DISPLAY[key].icon
	})

	const spacePillClass = computed(() => {
		const key = normalizeSpaceKey(currentTask.value?.spaceId)
		if (!key) return DEFAULT_SPACE_DISPLAY.pillClass
		return SPACE_DISPLAY[key].pillClass
	})

	const projectPath = computed(() => {
		const task = currentTask.value
		if (!task) return UNKNOWN_PROJECT_LABEL
		const projects = projectsStore.getProjectsOfSpace(task.spaceId)
		const defaultProject = getDefaultProject(projects)
		const project = task.projectId ? projects.find((p) => p.id === task.projectId) : defaultProject
		if (!project) return UNKNOWN_PROJECT_LABEL
		return project.path || project.title
	})

	const projectTrail = computed(() => {
		const raw = projectPath.value?.trim()
		if (!raw) return []
		if (raw === UNKNOWN_PROJECT_LABEL) return [raw]
		const parts = raw
			.split('/')
			.map((item) => item.trim())
			.filter(Boolean)
		return parts.length ? parts : [raw]
	})

	const saveStateLabel = computed(() => {
		if (state.saveState.value === 'saving') return '保存中'
		if (state.saveState.value === 'saved') return '已保存'
		if (state.saveState.value === 'error') return '保存失败'
		return ''
	})

	const saveStateClass = computed(() => {
		if (state.saveState.value === 'saving') return 'text-blue-500'
		if (state.saveState.value === 'saved') return 'text-emerald-500'
		if (state.saveState.value === 'error') return 'text-rose-500'
		return 'text-muted'
	})

	const saveStateDotClass = computed(() => {
		if (state.saveState.value === 'saving') return 'bg-blue-500'
		if (state.saveState.value === 'saved') return 'bg-emerald-500'
		if (state.saveState.value === 'error') return 'bg-rose-500'
		return 'bg-muted'
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
