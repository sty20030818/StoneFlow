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

	const priorityCardClass = computed(() => {
		const p = state.priorityLocal.value as keyof typeof TASK_PRIORITY_STYLES
		return (TASK_PRIORITY_STYLES[p] || TASK_PRIORITY_STYLES.default).cardClass
	})

	const priorityIconClass = computed(() => {
		const p = state.priorityLocal.value as keyof typeof TASK_PRIORITY_STYLES
		return (TASK_PRIORITY_STYLES[p] || TASK_PRIORITY_STYLES.default).iconClass
	})

	const priorityTextClass = computed(() => {
		const p = state.priorityLocal.value as keyof typeof TASK_PRIORITY_STYLES
		return (TASK_PRIORITY_STYLES[p] || TASK_PRIORITY_STYLES.default).textClass
	})

	const spaceCardClass = computed(() => {
		const display = SPACE_DISPLAY[state.spaceIdLocal.value as keyof typeof SPACE_DISPLAY]
		return display?.cardClass ?? DEFAULT_SPACE_DISPLAY.cardClass
	})

	const spaceCardLabelClass = computed(() => {
		const display = SPACE_DISPLAY[state.spaceIdLocal.value as keyof typeof SPACE_DISPLAY]
		return display?.cardLabelClass ?? DEFAULT_SPACE_DISPLAY.cardLabelClass
	})

	const spaceCardValueClass = computed(() => {
		const display = SPACE_DISPLAY[state.spaceIdLocal.value as keyof typeof SPACE_DISPLAY]
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
		const sid = currentTask.value?.spaceId
		if (!sid) return DEFAULT_SPACE_DISPLAY.label
		return SPACE_DISPLAY[sid as keyof typeof SPACE_DISPLAY]?.label ?? sid
	})

	const currentSpaceIcon = computed(() => {
		const sid = currentTask.value?.spaceId
		if (!sid) return DEFAULT_SPACE_DISPLAY.icon
		return SPACE_DISPLAY[sid as keyof typeof SPACE_DISPLAY]?.icon ?? DEFAULT_SPACE_DISPLAY.icon
	})

	const spacePillClass = computed(() => {
		const sid = currentTask.value?.spaceId
		if (!sid) return DEFAULT_SPACE_DISPLAY.pillClass
		return SPACE_DISPLAY[sid as keyof typeof SPACE_DISPLAY]?.pillClass ?? DEFAULT_SPACE_DISPLAY.pillClass
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
		if (state.saveState.value === 'saving') return 'bg-blue-500 animate-pulse'
		if (state.saveState.value === 'saved') return 'bg-emerald-500'
		if (state.saveState.value === 'error') return 'bg-rose-500'
		return 'bg-muted'
	})

	const timelineItems = computed(() => {
		const t = currentTask.value
		if (!t) return []

		const created = new Date(t.createdAt)
		const completed = t.completedAt ? new Date(t.completedAt) : null

		const items = [
			{
				label: '创建',
				content: created.toLocaleString(),
				icon: 'i-lucide-circle-dot',
			},
		]

		if (completed) {
			items.push({
				label: '完成',
				content: completed.toLocaleString(),
				icon: 'i-lucide-check-circle-2',
			})
		}

		return items
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
		timelineItems,
	}
}
