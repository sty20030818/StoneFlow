import { computed, ref, watch } from 'vue'

import type { ProjectDto } from '@/services/api/projects'
import { getDefaultProject } from '@/services/api/projects'
import type { TaskDoneReason, TaskDto, TaskStatus, UpdateTaskPatch } from '@/services/api/tasks'
import { createTask, updateTask } from '@/services/api/tasks'
import {
	PROJECT_ICON,
	PROJECT_LEVEL_TEXT_CLASSES,
	PROJECT_UNCATEGORIZED_ICON,
	PROJECT_UNCATEGORIZED_ICON_CLASS,
	UNCATEGORIZED_LABEL,
} from '@/config/project'
import { SPACE_IDS, SPACE_OPTIONS, type SpaceId } from '@/config/space'
import { TASK_DONE_REASON_OPTIONS, TASK_PRIORITY_OPTIONS, type TaskPriorityValue } from '@/config/task'
import { useProjectsStore } from '@/stores/projects'
import { useRefreshSignalsStore } from '@/stores/refresh-signals'
import { statusOptions } from '@/utils/task'

export type CreateTaskModalProps = {
	modelValue: boolean
	spaceId?: string
	projectId?: string
	projects?: ProjectDto[]
}

export type CreateTaskModalEmits = {
	(e: 'update:modelValue', value: boolean): void
	(e: 'created', task: TaskDto): void
}

export type CreateTaskFormState = {
	title: string
	spaceId: SpaceId
	projectId: string | null
	status: TaskStatus
	doneReason: TaskDoneReason
	priority: TaskPriorityValue
	deadlineDate: string
	tags: string[]
	note: string
}

export type ProjectOption = {
	value: string | null
	label: string
	icon: string
	iconClass: string
	depth: number
}

export function useCreateTaskModal(props: CreateTaskModalProps, emit: CreateTaskModalEmits) {
	const projectsStore = useProjectsStore()
	const refreshSignals = useRefreshSignalsStore()

	const loading = ref(false)
	const defaultProjectId = ref<string | null>(null)
	const isOpen = computed({
		get: () => props.modelValue,
		set: (value) => emit('update:modelValue', value),
	})

	const statusOptionsArray = [...statusOptions]

	function normalizeSpaceId(value?: string): SpaceId {
		const candidate = value as SpaceId | undefined
		if (candidate && SPACE_IDS.includes(candidate)) return candidate
		return 'work'
	}

	const form = ref<CreateTaskFormState>({
		title: '',
		spaceId: normalizeSpaceId(props.spaceId),
		projectId: null,
		status: 'todo',
		doneReason: 'completed',
		priority: 'P1',
		deadlineDate: '',
		tags: [],
		note: '',
	})

	const tagInput = ref('')

	const canSubmit = computed(() => form.value.title.trim().length > 0)

	const spaceOptions = SPACE_OPTIONS
	const priorityOptions = TASK_PRIORITY_OPTIONS
	const doneReasonOptions = TASK_DONE_REASON_OPTIONS

	const levelColors = PROJECT_LEVEL_TEXT_CLASSES
	const uncategorizedLabel = UNCATEGORIZED_LABEL

	function addTag() {
		const tag = tagInput.value.trim()
		if (tag && !form.value.tags.includes(tag)) {
			form.value.tags.push(tag)
			tagInput.value = ''
		}
	}

	function removeTag(tag: string) {
		form.value.tags = form.value.tags.filter((t) => t !== tag)
	}

	const projectOptions = computed<ProjectOption[]>(() => {
		const options: ProjectOption[] = [
			{
				value: null,
				label: UNCATEGORIZED_LABEL,
				icon: PROJECT_UNCATEGORIZED_ICON,
				iconClass: PROJECT_UNCATEGORIZED_ICON_CLASS,
				depth: 0,
			},
		]

		const storeProjects = projectsStore.getProjectsOfSpace(form.value.spaceId)
		const fallbackProjects = (props.projects ?? []).filter((p) => p.spaceId === form.value.spaceId)
		const projectsList = storeProjects.length > 0 ? storeProjects : fallbackProjects
		if (!projectsList.length) return options

		function buildTree(parentId: string | null, depth: number) {
			const children = projectsList.filter((p) => p.parentId === parentId && !p.id.endsWith('_default'))
			for (const project of children) {
				options.push({
					value: project.id,
					label: project.name,
					icon: PROJECT_ICON,
					iconClass: levelColors[depth % levelColors.length],
					depth,
				})
				buildTree(project.id, depth + 1)
			}
		}

		buildTree(null, 0)
		return options
	})

	watch(
		() => form.value.spaceId,
		async (newSpaceId, oldSpaceId) => {
			if (oldSpaceId && newSpaceId !== oldSpaceId) {
				form.value.projectId = null
			}
			await projectsStore.loadForSpace(newSpaceId)
			try {
				const defaultProject = await getDefaultProject(newSpaceId)
				defaultProjectId.value = defaultProject.id
				form.value.projectId = defaultProject.id
			} catch (error) {
				console.error('加载默认项目失败:', error)
			}
		},
	)

	watch(
		() => props.spaceId,
		(newSpaceId) => {
			form.value.spaceId = normalizeSpaceId(newSpaceId)
		},
		{ immediate: true },
	)

	watch(isOpen, async (open) => {
		if (!open) return

		form.value.title = ''
		form.value.status = 'todo'
		form.value.doneReason = 'completed'
		form.value.priority = 'P1'
		form.value.deadlineDate = ''
		form.value.tags = []
		form.value.note = ''
		tagInput.value = ''
		form.value.spaceId = normalizeSpaceId(props.spaceId)

		await projectsStore.loadForSpace(form.value.spaceId)
		try {
			const defaultProject = await getDefaultProject(form.value.spaceId)
			defaultProjectId.value = defaultProject.id

			const candidateProjectId = props.projectId ?? null
			const projectsOfSpace = projectsStore.getProjectsOfSpace(form.value.spaceId)
			const hasCandidate = !!candidateProjectId && projectsOfSpace.some((p) => p.id === candidateProjectId)
			form.value.projectId = hasCandidate ? candidateProjectId : defaultProjectId.value
		} catch (error) {
			console.error('加载默认项目失败:', error)
		}
	})

	async function handleSubmit() {
		if (!canSubmit.value || loading.value) return

		loading.value = true
		try {
			const projectId = form.value.projectId ?? defaultProjectId.value

			const task = await createTask({
				spaceId: form.value.spaceId,
				title: form.value.title.trim(),
				autoStart: false,
				projectId,
			})

			const updatePatch: UpdateTaskPatch = {}

			if (form.value.status === 'done') {
				updatePatch.status = 'done'
				updatePatch.doneReason = form.value.doneReason ?? 'completed'
			}

			if (form.value.priority && form.value.priority !== 'P1') {
				updatePatch.priority = form.value.priority
			}

			if (form.value.note?.trim()) {
				updatePatch.note = form.value.note.trim()
			}

			if (form.value.deadlineDate) {
				const date = new Date(form.value.deadlineDate)
				date.setHours(0, 0, 0, 0)
				updatePatch.deadlineAt = date.getTime()
			}

			if (form.value.tags.length > 0) {
				updatePatch.tags = form.value.tags
			}

			if (Object.keys(updatePatch).length > 0) {
				await updateTask(task.id, updatePatch)
				if (updatePatch.status) task.status = updatePatch.status as TaskDto['status']
				if (updatePatch.doneReason !== undefined) task.doneReason = updatePatch.doneReason
				if (updatePatch.deadlineAt !== undefined) task.deadlineAt = updatePatch.deadlineAt
				if (updatePatch.priority) task.priority = updatePatch.priority
				if (updatePatch.note !== undefined) task.note = updatePatch.note
				if (updatePatch.tags) task.tags = updatePatch.tags
			}

			refreshSignals.bumpTask()
			emit('created', task)
			close()
		} catch (error) {
			console.error('创建任务失败:', error)
		} finally {
			loading.value = false
		}
	}

	function close() {
		isOpen.value = false
	}

	return {
		isOpen,
		form,
		tagInput,
		loading,
		canSubmit,
		spaceOptions,
		projectOptions,
		statusOptionsArray,
		priorityOptions,
		doneReasonOptions,
		uncategorizedLabel,
		addTag,
		removeTag,
		handleSubmit,
		close,
	}
}
