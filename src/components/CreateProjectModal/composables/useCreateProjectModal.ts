import { computed, reactive, ref, watch } from 'vue'

import type { ProjectDto } from '@/services/api/projects'
import { createProject } from '@/services/api/projects'
import {
	PROJECT_ICON,
	PROJECT_LEVEL_TEXT_CLASSES,
	PROJECT_PRIORITY_OPTIONS,
	PROJECT_ROOT_ICON_CLASS,
	PROJECT_ROOT_LABEL,
	PROJECT_STATUS_OPTIONS,
	type ProjectPriorityValue,
	type ProjectStatusValue,
} from '@/config/project'
import { SPACE_IDS, SPACE_OPTIONS, type SpaceId } from '@/config/space'
import { useProjectsStore } from '@/stores/projects'
import { useRefreshSignalsStore } from '@/stores/refresh-signals'

export type CreateProjectModalProps = {
	modelValue: boolean
	spaceId?: string
	projects?: ProjectDto[]
}

export type CreateProjectModalEmits = {
	(e: 'update:modelValue', value: boolean): void
	(e: 'created', project: ProjectDto): void
}

export type CreateProjectFormState = {
	name: string
	spaceId: SpaceId
	parentId: string | null
	note: string | null
	status: ProjectStatusValue
	priority: ProjectPriorityValue
}

export type SelectOption<TValue extends string | null = string | null> = {
	value: TValue
	label: string
	icon: string
	iconClass: string
	depth?: number
}

export type SpaceOption = SelectOption<SpaceId>
export type StatusOption = SelectOption<ProjectStatusValue>
export type PriorityOption = SelectOption<ProjectPriorityValue>

export type ParentProjectOption = SelectOption<string | null> & {
	depth: number
}

export function useCreateProjectModal(props: CreateProjectModalProps, emit: CreateProjectModalEmits) {
	const projectsStore = useProjectsStore()
	const refreshSignals = useRefreshSignalsStore()

	const loading = ref(false)
	const isOpen = computed({
		get: () => props.modelValue,
		set: (value) => emit('update:modelValue', value),
	})

	function normalizeSpaceId(value?: string): SpaceId {
		const candidate = value as SpaceId | undefined
		if (candidate && SPACE_IDS.includes(candidate)) return candidate
		return 'work'
	}

	const form = reactive<CreateProjectFormState>({
		name: '',
		spaceId: normalizeSpaceId(props.spaceId),
		parentId: null,
		note: null,
		status: 'active',
		priority: 'P1',
	})

	const canSubmit = computed(() => form.name.trim().length > 0)

	const spaceOptions: SpaceOption[] = SPACE_OPTIONS
	const statusOptions: StatusOption[] = [...PROJECT_STATUS_OPTIONS]
	const priorityOptions: PriorityOption[] = PROJECT_PRIORITY_OPTIONS

	const levelColors = PROJECT_LEVEL_TEXT_CLASSES
	const projectRootLabel = PROJECT_ROOT_LABEL

	const currentParentProjectOptions = ref<ParentProjectOption[]>([
		{
			value: null,
			label: PROJECT_ROOT_LABEL,
			icon: PROJECT_ICON,
			iconClass: PROJECT_ROOT_ICON_CLASS,
			depth: 0,
		},
	])

	function buildParentProjectOptions(spaceId: string) {
		const storeProjects = projectsStore.getProjectsOfSpace(spaceId)
		const fallbackProjects = (props.projects ?? []).filter((p) => p.space_id === spaceId)
		const projectsList = storeProjects.length > 0 ? storeProjects : fallbackProjects

		const filtered = projectsList.filter((p) => !p.id.endsWith('_default'))

		const byParent = new Map<string | null, typeof filtered>()
		for (const p of filtered) {
			const bucket = byParent.get(p.parent_id) ?? []
			bucket.push(p)
			byParent.set(p.parent_id, bucket)
		}

		const options: ParentProjectOption[] = [
			{
				value: null,
				label: PROJECT_ROOT_LABEL,
				icon: PROJECT_ICON,
				iconClass: PROJECT_ROOT_ICON_CLASS,
				depth: 0,
			},
		]

		function buildTree(parentId: string | null, depth: number) {
			const children = byParent.get(parentId) ?? []
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
	}

	async function refreshParentProjectOptions() {
		await projectsStore.loadForSpace(form.spaceId)
		currentParentProjectOptions.value = buildParentProjectOptions(form.spaceId)
	}

	watch(
		() => form.spaceId,
		async (newSpaceId, oldSpaceId) => {
			if (oldSpaceId && newSpaceId !== oldSpaceId) {
				form.parentId = null
			}
			await refreshParentProjectOptions()
		},
	)

	watch(
		() => props.spaceId,
		(newSpaceId) => {
			form.spaceId = normalizeSpaceId(newSpaceId)
		},
	)

	watch(isOpen, async (open) => {
		if (!open) return

		form.name = ''
		form.parentId = null
		form.note = null
		form.status = 'active'
		form.priority = 'P1'
		form.spaceId = normalizeSpaceId(props.spaceId)
		await refreshParentProjectOptions()
	})

	async function handleSubmit() {
		if (!canSubmit.value || loading.value) return

		loading.value = true
		try {
			const project = await createProject({
				spaceId: form.spaceId,
				name: form.name.trim(),
				parentId: form.parentId,
				note: form.note?.trim() || null,
				status: form.status,
				priority: form.priority,
			})

			await projectsStore.loadForSpace(form.spaceId, true)
			refreshSignals.bumpProject()
			emit('created', project)
			close()
		} catch (error) {
			console.error('创建项目失败:', error)
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
		loading,
		canSubmit,
		spaceOptions,
		statusOptions,
		priorityOptions,
		currentParentProjectOptions,
		projectRootLabel,
		handleSubmit,
		close,
	}
}
