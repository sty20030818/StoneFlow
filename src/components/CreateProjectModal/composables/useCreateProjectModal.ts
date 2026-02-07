import { computed, reactive, ref, watch } from 'vue'

import type { ProjectDto } from '@/services/api/projects'
import { createProject } from '@/services/api/projects'
import type { LinkDto, LinkInput } from '@/services/api/tasks'
import {
	PROJECT_ICON,
	PROJECT_LEVEL_TEXT_CLASSES,
	PROJECT_PRIORITY_OPTIONS,
	PROJECT_ROOT_ICON_CLASS,
	PROJECT_ROOT_LABEL,
	type ProjectPriorityValue,
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

export type ProjectLinkFormItem = {
	id?: string
	title: string
	url: string
	kind: LinkDto['kind']
	rank: string
}

export type CreateProjectFormState = {
	title: string
	spaceId: SpaceId
	parentId: string | null
	note: string | null
	priority: ProjectPriorityValue
	tags: string[]
	links: ProjectLinkFormItem[]
}

export type SelectOption<TValue extends string | null = string | null> = {
	value: TValue
	label: string
	icon: string
	iconClass: string
	depth?: number
}

export type SpaceOption = SelectOption<SpaceId>
export type PriorityOption = SelectOption<ProjectPriorityValue>

export type ParentProjectOption = SelectOption<string | null> & {
	depth: number
}

export type LinkKindOption = {
	value: LinkDto['kind']
	label: string
}

const PROJECT_LINK_KIND_OPTIONS: LinkKindOption[] = [
	{ value: 'web', label: 'Web' },
	{ value: 'doc', label: 'Doc' },
	{ value: 'design', label: 'Design' },
	{ value: 'repoLocal', label: 'Repo (Local)' },
	{ value: 'repoRemote', label: 'Repo (Remote)' },
	{ value: 'other', label: 'Other' },
]

export function useCreateProjectModal(props: CreateProjectModalProps, emit: CreateProjectModalEmits) {
	const projectsStore = useProjectsStore()
	const refreshSignals = useRefreshSignalsStore()

	const loading = ref(false)
	const tagInput = ref('')
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
		title: '',
		spaceId: normalizeSpaceId(props.spaceId),
		parentId: null,
		note: null,
		priority: 'P1',
		tags: [],
		links: [],
	})

	const canSubmit = computed(() => form.title.trim().length > 0)

	const spaceOptions: SpaceOption[] = SPACE_OPTIONS
	const priorityOptions: PriorityOption[] = PROJECT_PRIORITY_OPTIONS
	const linkKindOptions: LinkKindOption[] = PROJECT_LINK_KIND_OPTIONS

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
		const fallbackProjects = (props.projects ?? []).filter((p) => p.spaceId === spaceId)
		const projectsList = storeProjects.length > 0 ? storeProjects : fallbackProjects

		const filtered = projectsList.filter((p) => !p.id.endsWith('_default'))

		const byParent = new Map<string | null, typeof filtered>()
		for (const p of filtered) {
			const bucket = byParent.get(p.parentId) ?? []
			bucket.push(p)
			byParent.set(p.parentId, bucket)
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
	}

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

	function normalizeLinks(values: ProjectLinkFormItem[]): LinkInput[] {
		const result: LinkInput[] = []
		for (const link of values) {
			const url = link.url.trim()
			if (!url) continue
			const title = link.title.trim()
			const rankInput = link.rank.trim()
			const parsedRank = rankInput ? Number.parseInt(rankInput, 10) : Number.NaN
			result.push({
				id: link.id,
				title,
				url,
				kind: link.kind,
				rank: Number.isFinite(parsedRank) ? parsedRank : undefined,
			})
		}
		return result
	}

	function addTag() {
		const tag = tagInput.value.trim()
		if (!tag || form.tags.includes(tag)) return
		form.tags.push(tag)
		tagInput.value = ''
	}

	function removeTag(tag: string) {
		form.tags = form.tags.filter((t) => t !== tag)
	}

	function addLink() {
		form.links.push({
			title: '',
			url: '',
			kind: 'web',
			rank: '',
		})
	}

	function removeLink(index: number) {
		if (index < 0 || index >= form.links.length) return
		form.links.splice(index, 1)
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

		form.title = ''
		form.parentId = null
		form.note = null
		form.priority = 'P1'
		form.tags = []
		form.links = []
		tagInput.value = ''
		form.spaceId = normalizeSpaceId(props.spaceId)
		await refreshParentProjectOptions()
	})

	async function handleSubmit() {
		if (!canSubmit.value || loading.value) return

		loading.value = true
		try {
			const project = await createProject({
				spaceId: form.spaceId,
				title: form.title.trim(),
				parentId: form.parentId,
				note: form.note?.trim() || null,
				priority: form.priority,
				tags: normalizeTags(form.tags),
				links: normalizeLinks(form.links),
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
		tagInput,
		loading,
		canSubmit,
		spaceOptions,
		priorityOptions,
		linkKindOptions,
		currentParentProjectOptions,
		projectRootLabel,
		addTag,
		removeTag,
		addLink,
		removeLink,
		handleSubmit,
		close,
	}
}
