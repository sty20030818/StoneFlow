import { useToggle, useVModel, watchDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

import type { ProjectDto } from '@/services/api/projects'
import { getDefaultProject } from '@/services/api/projects'
import type {
	CustomFieldItem,
	LinkDto,
	LinkInput,
	TaskDoneReason,
	TaskDto,
	TaskStatus,
	UpdateTaskPatch,
} from '@/services/api/tasks'
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
import { validateWithZod } from '@/composables/base/zod'
import { taskSubmitSchema } from '@/composables/domain/validation/forms'
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

export type TaskLinkFormItem = {
	id?: string
	title: string
	url: string
	kind: LinkDto['kind']
}

export type TaskCustomFieldFormItem = {
	rank: number
	title: string
	value: string
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
	links: TaskLinkFormItem[]
	note: string
	customFields: TaskCustomFieldFormItem[]
}

export type ProjectOption = {
	value: string | null
	label: string
	icon: string
	iconClass: string
	depth: number
}

export type LinkKindOption = {
	value: LinkDto['kind']
	label: string
}

const TASK_LINK_KIND_OPTIONS: LinkKindOption[] = [
	{ value: 'web', label: 'Web' },
	{ value: 'doc', label: 'Doc' },
	{ value: 'design', label: 'Design' },
	{ value: 'repoLocal', label: 'Repo (Local)' },
	{ value: 'repoRemote', label: 'Repo (Remote)' },
	{ value: 'other', label: 'Other' },
]

export function useCreateTaskModal(props: CreateTaskModalProps, emit: CreateTaskModalEmits) {
	const toast = useToast()
	const projectsStore = useProjectsStore()
	const refreshSignals = useRefreshSignalsStore()

	const loading = ref(false)
	const defaultProjectId = ref<string | null>(null)
	const isOpen = useVModel(props, 'modelValue', emit)

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
		links: [],
		note: '',
		customFields: [],
	})

	const tagInput = ref('')
	const advancedOpen = ref(false)
	const toggleAdvanced = useToggle(advancedOpen)

	const canSubmit = computed(() => form.value.title.trim().length > 0)

	const spaceOptions = SPACE_OPTIONS
	const priorityOptions = TASK_PRIORITY_OPTIONS
	const doneReasonOptions = TASK_DONE_REASON_OPTIONS
	const linkKindOptions = TASK_LINK_KIND_OPTIONS

	const levelColors = PROJECT_LEVEL_TEXT_CLASSES
	const uncategorizedLabel = UNCATEGORIZED_LABEL

	function normalizeTags(values: string[]): string[] {
		const seen = new Set<string>()
		const result: string[] = []
		for (const raw of values) {
			const tag = raw.trim()
			if (!tag || seen.has(tag)) continue
			seen.add(tag)
			result.push(tag)
		}
		return result
	}

	function normalizeLinks(values: TaskLinkFormItem[]): LinkInput[] {
		const result: LinkInput[] = []
		for (const link of values) {
			const url = link.url.trim()
			if (!url) continue
			const title = link.title.trim()
			result.push({
				id: link.id,
				title,
				url,
				kind: link.kind,
			})
		}
		return result
	}

	function normalizeCustomFields(values: TaskCustomFieldFormItem[]): CustomFieldItem[] {
		return values
			.map((item, index) => ({ item, index }))
			.sort((left, right) => {
				const rankDiff = left.item.rank - right.item.rank
				if (rankDiff !== 0) return rankDiff
				return left.index - right.index
			})
			.flatMap(({ item }, normalizedRank) => {
				const title = item.title.trim()
				if (!title) return []
				const rawValue = item.value.trim()
				return [{
					rank: normalizedRank,
					title,
					value: rawValue ? rawValue : null,
				}]
			})
	}

	function addTag() {
		const tag = tagInput.value.trim()
		if (!tag || form.value.tags.includes(tag)) return
		form.value.tags.push(tag)
		tagInput.value = ''
	}

	function removeTag(tag: string) {
		form.value.tags = form.value.tags.filter((t) => t !== tag)
	}

	function addLink() {
		form.value.links.push({
			title: '',
			url: '',
			kind: 'web',
		})
	}

	function removeLink(index: number) {
		if (index < 0 || index >= form.value.links.length) return
		form.value.links.splice(index, 1)
	}

	function addCustomField() {
		const nextRank = form.value.customFields.length
			? Math.max(...form.value.customFields.map((item, index) => (Number.isFinite(item.rank) ? item.rank : index))) + 1
			: 0
		form.value.customFields.push({
			rank: nextRank,
			title: '',
			value: '',
		})
	}

	function removeCustomField(index: number) {
		if (index < 0 || index >= form.value.customFields.length) return
		form.value.customFields.splice(index, 1)
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
					label: project.title,
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

	watchDebounced(
		() => form.value.spaceId,
		async (newSpaceId, oldSpaceId) => {
			if (oldSpaceId && newSpaceId !== oldSpaceId) {
				form.value.projectId = null
			}
			await projectsStore.load(newSpaceId)
			try {
				const defaultProject = await getDefaultProject(newSpaceId)
				defaultProjectId.value = defaultProject.id
				form.value.projectId = defaultProject.id
			} catch (error) {
				console.error('加载默认项目失败:', error)
			}
		},
		{ debounce: 80, maxWait: 240 },
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
		form.value.links = []
		form.value.note = ''
		form.value.customFields = []
		tagInput.value = ''
		advancedOpen.value = false
		form.value.spaceId = normalizeSpaceId(props.spaceId)

		await projectsStore.load(form.value.spaceId)
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
		const validation = validateWithZod(taskSubmitSchema, { title: form.value.title })
		if (!validation.ok) {
			toast.add({ title: validation.message, color: 'error' })
			return
		}

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

			const tags = normalizeTags(form.value.tags)
			if (tags.length > 0) {
				updatePatch.tags = tags
			}

			const links = normalizeLinks(form.value.links)
			if (links.length > 0) {
				updatePatch.links = links
			}

			const customFields = normalizeCustomFields(form.value.customFields)
			if (customFields.length > 0) {
				updatePatch.customFields = { fields: customFields }
			}

			if (Object.keys(updatePatch).length > 0) {
				await updateTask(task.id, updatePatch)
				if (updatePatch.status) task.status = updatePatch.status as TaskDto['status']
				if (updatePatch.doneReason !== undefined) task.doneReason = updatePatch.doneReason
				if (updatePatch.deadlineAt !== undefined) task.deadlineAt = updatePatch.deadlineAt
				if (updatePatch.priority) task.priority = updatePatch.priority
				if (updatePatch.note !== undefined) task.note = updatePatch.note
				if (updatePatch.tags) task.tags = updatePatch.tags
				if (updatePatch.customFields !== undefined) task.customFields = updatePatch.customFields
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
		advancedOpen,
		loading,
		canSubmit,
		spaceOptions,
		projectOptions,
		statusOptionsArray,
		priorityOptions,
		doneReasonOptions,
		linkKindOptions,
		uncategorizedLabel,
		toggleAdvanced,
		addTag,
		removeTag,
		addLink,
		removeLink,
		addCustomField,
		removeCustomField,
		handleSubmit,
		close,
	}
}
