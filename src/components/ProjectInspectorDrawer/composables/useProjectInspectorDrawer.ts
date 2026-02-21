import { useEventListener, useTimeoutFn, watchDebounced } from '@vueuse/core'
import { computed, reactive, ref, watch } from 'vue'

import { PROJECT_PRIORITY_OPTIONS, PROJECT_ROOT_LABEL, type ProjectPriorityValue, isDefaultProjectId } from '@/config/project'
import type { ProjectDto, UpdateProjectPatch } from '@/services/api/projects'
import { updateProject } from '@/services/api/projects'
import type { LinkDto, LinkInput } from '@/services/api/tasks'
import { useProjectInspectorStore } from '@/stores/projectInspector'
import { useProjectsStore } from '@/stores/projects'
import { useRefreshSignalsStore } from '@/stores/refresh-signals'

type ParentProjectOption = {
	value: string | null
	label: string
	depth: number
}

type ProjectLinkFormItem = {
	id?: string
	title: string
	url: string
	kind: LinkDto['kind']
}

const TEXT_AUTOSAVE_DEBOUNCE = 600
const TEXT_AUTOSAVE_MAX_WAIT = 2000

const PROJECT_LINK_KIND_OPTIONS: Array<{ value: LinkDto['kind']; label: string }> = [
	{ value: 'web', label: 'Web' },
	{ value: 'doc', label: 'Doc' },
	{ value: 'design', label: 'Design' },
	{ value: 'repoLocal', label: 'Repo (Local)' },
	{ value: 'repoRemote', label: 'Repo (Remote)' },
	{ value: 'other', label: 'Other' },
]

export function useProjectInspectorDrawer() {
	const store = useProjectInspectorStore()
	const projectsStore = useProjectsStore()
	const refreshSignals = useRefreshSignalsStore()

	const currentProject = computed<ProjectDto | null>(() => store.project ?? null)
	const isOpen = computed({
		get: () => store.isOpen,
		set: (value) => {
			if (!value) {
				void close()
			}
		},
	})

	const titleLocal = ref('')
	const noteLocal = ref('')
	const priorityLocal = ref<ProjectPriorityValue>('P1')
	const parentIdLocal = ref<string | null>(null)
	const tagsLocal = ref<string[]>([])
	const tagInput = ref('')
	const linksLocal = ref<ProjectLinkFormItem[]>([])
	const linkDraftTitle = ref('')
	const linkDraftUrl = ref('')
	const linkDraftKind = ref<LinkDto['kind']>('web')
	const linkDraftVisible = ref(false)
	const linkValidationErrorIndex = ref<number | null>(null)

	const textInteraction = reactive({
		titleComposing: false,
		noteComposing: false,
	})
	const suppressAutosave = ref(false)
	const pendingSaves = ref(0)
	const parentOptions = ref<ParentProjectOption[]>([{ value: null, label: PROJECT_ROOT_LABEL, depth: 0 }])

	let stagedPatch: UpdateProjectPatch = {}
	let queueRunning = false
	let retryPatch: UpdateProjectPatch | null = null

	const priorityOptions = PROJECT_PRIORITY_OPTIONS
	const linkKindOptions = PROJECT_LINK_KIND_OPTIONS
	const rootLabel = PROJECT_ROOT_LABEL

	const isStructureLocked = computed(() => {
		const project = currentProject.value
		if (!project) return false
		return isDefaultProjectId(project.id)
	})

	const isSaveStateVisible = computed(() => store.saveState !== 'idle')
	const canRetrySave = computed(() => store.retrySaveAvailable)

	const { start: startSavedTimer, stop: stopSavedTimer } = useTimeoutFn(
		() => {
			store.setSaveState('idle')
		},
		1200,
		{ immediate: false },
	)
	const { start: startErrorTimer, stop: stopErrorTimer } = useTimeoutFn(
		() => {
			store.setSaveState('idle')
		},
		3000,
		{ immediate: false },
	)

	function clearSaveStateTimer() {
		stopSavedTimer()
		stopErrorTimer()
	}

	function beginSave() {
		pendingSaves.value += 1
		store.setSaveState('saving')
		clearSaveStateTimer()
	}

	function endSave(ok: boolean) {
		pendingSaves.value = Math.max(0, pendingSaves.value - 1)
		if (pendingSaves.value > 0) return
		clearSaveStateTimer()
		if (ok) {
			store.setSaveState('saved')
			startSavedTimer()
			return
		}
		store.setSaveState('error')
		startErrorTimer()
	}

	function hasPatchValue(patch: UpdateProjectPatch): boolean {
		return Object.keys(patch).length > 0
	}

	function normalizeOptionalText(value: string): string | null {
		const normalized = value.trim()
		return normalized ? normalized : null
	}

	function normalizeTags(values: string[]): string[] {
		const seen = new Set<string>()
		const result: string[] = []
		for (const value of values) {
			const normalized = value.trim()
			if (!normalized || seen.has(normalized)) continue
			seen.add(normalized)
			result.push(normalized)
		}
		return result
	}

	function normalizeLinks(values: ProjectLinkFormItem[]): LinkInput[] {
		return values
			.map((item, index) => ({
				id: item.id,
				title: item.title.trim(),
				url: item.url.trim(),
				kind: item.kind,
				rank: index,
			}))
			.filter((item) => item.url.length > 0)
	}

	function findInvalidLinkIndex(): number {
		return linksLocal.value.findIndex((item) => item.url.trim().length === 0)
	}

	function toLinkFormItems(links: LinkDto[]): ProjectLinkFormItem[] {
		return links.map((item) => ({
			id: item.id,
			title: item.title,
			url: item.url,
			kind: item.kind,
		}))
	}

	function stageUpdate(patch: UpdateProjectPatch): boolean {
		if (!hasPatchValue(patch)) return false
		stagedPatch = {
			...stagedPatch,
			...patch,
		}
		return true
	}

	function queueImmediateUpdate(patch: UpdateProjectPatch) {
		if (!stageUpdate(patch)) return
		void processQueuedUpdates()
	}

	function queueDebouncedUpdate(patch: UpdateProjectPatch) {
		if (!stageUpdate(patch)) return
		void processQueuedUpdates()
	}

	async function refreshStoreProject(spaceId: string, projectId: string) {
		await projectsStore.load(spaceId, { force: true })
		const latest = projectsStore.getProjectsOfSpace(spaceId).find((item) => item.id === projectId) ?? null
		store.setProject(latest)
	}

	function patchStoreProject(patch: UpdateProjectPatch) {
		const draftPatch: Partial<ProjectDto> = {}
		if (patch.title !== undefined) draftPatch.title = patch.title
		if (patch.note !== undefined) draftPatch.note = patch.note
		if (patch.priority !== undefined) draftPatch.priority = patch.priority
		if (patch.parentId !== undefined) draftPatch.parentId = patch.parentId
		if (patch.tags !== undefined) draftPatch.tags = patch.tags
		store.patchProject(draftPatch)
	}

	async function commitUpdateNow(patch: UpdateProjectPatch): Promise<boolean> {
		const project = currentProject.value
		if (!project || !hasPatchValue(patch)) return true

		beginSave()
		try {
			await updateProject(project.id, patch)
			patchStoreProject(patch)
			await refreshStoreProject(project.spaceId, project.id)
			refreshSignals.bumpProject()
			retryPatch = null
			store.setRetrySaveAvailable(false)
			endSave(true)
			return true
		} catch (error) {
			console.error('更新项目失败:', error)
			retryPatch = { ...patch }
			store.setRetrySaveAvailable(true)
			endSave(false)
			return false
		}
	}

	async function processQueuedUpdates() {
		if (queueRunning) return
		queueRunning = true

		try {
			while (hasPatchValue(stagedPatch)) {
				const currentPatch = stagedPatch
				stagedPatch = {}
				const ok = await commitUpdateNow(currentPatch)
				if (!ok) {
					stagedPatch = {
						...currentPatch,
						...stagedPatch,
					}
					break
				}
			}
		} finally {
			queueRunning = false
			if (hasPatchValue(stagedPatch)) {
				void processQueuedUpdates()
			}
		}
	}

	function withAutosaveSuppressed<T>(fn: () => T): T {
		suppressAutosave.value = true
		try {
			return fn()
		} finally {
			suppressAutosave.value = false
		}
	}

	function collectDescendantIds(projects: ProjectDto[], rootId: string): Set<string> {
		const childrenMap = new Map<string, string[]>()
		for (const project of projects) {
			if (!project.parentId) continue
			const bucket = childrenMap.get(project.parentId) ?? []
			bucket.push(project.id)
			childrenMap.set(project.parentId, bucket)
		}

		const descendants = new Set<string>()
		const stack = [...(childrenMap.get(rootId) ?? [])]
		while (stack.length > 0) {
			const nextId = stack.pop()
			if (!nextId || descendants.has(nextId)) continue
			descendants.add(nextId)
			stack.push(...(childrenMap.get(nextId) ?? []))
		}
		return descendants
	}

	function buildParentOptions(project: ProjectDto): ParentProjectOption[] {
		const projects = projectsStore
			.getProjectsOfSpace(project.spaceId)
			.filter((item) => !isDefaultProjectId(item.id))
		const descendants = collectDescendantIds(projects, project.id)
		const disallowedIds = new Set<string>([project.id, ...descendants])

		const grouped = new Map<string | null, ProjectDto[]>()
		for (const item of projects) {
			const bucket = grouped.get(item.parentId) ?? []
			bucket.push(item)
			grouped.set(item.parentId, bucket)
		}

		const options: ParentProjectOption[] = [{ value: null, label: PROJECT_ROOT_LABEL, depth: 0 }]

		function appendByParent(parentId: string | null, depth: number) {
			const children = grouped.get(parentId) ?? []
			children.sort((a, b) => {
				if (a.rank !== b.rank) return a.rank - b.rank
				return a.createdAt - b.createdAt
			})
			for (const child of children) {
				if (!disallowedIds.has(child.id)) {
					options.push({
						value: child.id,
						label: child.title,
						depth,
					})
				}
				appendByParent(child.id, depth + 1)
			}
		}

		appendByParent(null, 0)
		return options
	}

	async function syncFromProject(project: ProjectDto) {
		await projectsStore.load(project.spaceId)
		withAutosaveSuppressed(() => {
			titleLocal.value = project.title
			noteLocal.value = project.note ?? ''
			priorityLocal.value = project.priority
			parentIdLocal.value = project.parentId ?? null
			tagsLocal.value = [...project.tags]
			linksLocal.value = toLinkFormItems(project.links)
			tagInput.value = ''
			linkDraftTitle.value = ''
			linkDraftUrl.value = ''
			linkDraftKind.value = 'web'
			linkDraftVisible.value = false
			linkValidationErrorIndex.value = null
		})
		parentOptions.value = buildParentOptions(project)
	}

	async function flushPendingUpdates() {
		stageTitleUpdate('immediate')
		stageNoteUpdate('immediate')
		stageLinksUpdate('immediate')
		await processQueuedUpdates()
	}

	async function close() {
		await flushPendingUpdates()
		store.close()
	}

	function onTitleCompositionStart() {
		textInteraction.titleComposing = true
	}

	function onTitleCompositionEnd() {
		textInteraction.titleComposing = false
		void flushPendingUpdates()
	}

	function onNoteCompositionStart() {
		textInteraction.noteComposing = true
	}

	function onNoteCompositionEnd() {
		textInteraction.noteComposing = false
		void flushPendingUpdates()
	}

	async function onTitleBlur() {
		await flushPendingUpdates()
	}

	async function onNoteBlur() {
		await flushPendingUpdates()
	}

	function stageTitleUpdate(mode: 'debounced' | 'immediate') {
		const project = currentProject.value
		if (!project || isStructureLocked.value) return
		if (mode === 'debounced' && (suppressAutosave.value || textInteraction.titleComposing)) return
		const nextTitle = titleLocal.value.trim()
		if (!nextTitle || nextTitle === project.title) return
		const patch = { title: nextTitle }
		if (mode === 'immediate') {
			queueImmediateUpdate(patch)
			return
		}
		queueDebouncedUpdate(patch)
	}

	function stageNoteUpdate(mode: 'debounced' | 'immediate') {
		const project = currentProject.value
		if (!project) return
		if (mode === 'debounced' && (suppressAutosave.value || textInteraction.noteComposing)) return
		const nextNote = normalizeOptionalText(noteLocal.value)
		if (nextNote === (project.note ?? null)) return
		const patch = { note: nextNote }
		if (mode === 'immediate') {
			queueImmediateUpdate(patch)
			return
		}
		queueDebouncedUpdate(patch)
	}

	function stageLinksUpdate(mode: 'debounced' | 'immediate') {
		const project = currentProject.value
		if (!project) return
		if (mode === 'debounced' && suppressAutosave.value) return
		const invalidIndex = findInvalidLinkIndex()
		if (invalidIndex >= 0) {
			linkValidationErrorIndex.value = invalidIndex
			return
		}
		linkValidationErrorIndex.value = null
		const linksPatch = normalizeLinks(linksLocal.value)
		const currentLinks = normalizeLinks(toLinkFormItems(project.links))
		if (JSON.stringify(linksPatch) === JSON.stringify(currentLinks)) return
		if (mode === 'immediate') {
			queueImmediateUpdate({ links: linksPatch })
			return
		}
		queueDebouncedUpdate({ links: linksPatch })
	}

	function addTag() {
		const nextTag = tagInput.value.trim()
		if (!nextTag || tagsLocal.value.includes(nextTag)) return
		tagsLocal.value.push(nextTag)
		tagInput.value = ''
		void onTagsChange()
	}

	function removeTag(tag: string) {
		tagsLocal.value = tagsLocal.value.filter((item) => item !== tag)
		void onTagsChange()
	}

	async function onTagsChange() {
		const project = currentProject.value
		if (!project || suppressAutosave.value) return
		const normalized = normalizeTags(tagsLocal.value)
		if (JSON.stringify(normalized) === JSON.stringify(project.tags)) return
		queueImmediateUpdate({ tags: normalized })
	}

	function addLinkDraft() {
		linkDraftVisible.value = true
	}

	function confirmLinkDraft() {
		const url = linkDraftUrl.value.trim()
		if (!url) return
		const title = linkDraftTitle.value.trim()
		linksLocal.value.push({
			title,
			url,
			kind: linkDraftKind.value,
		})
		linkDraftTitle.value = ''
		linkDraftUrl.value = ''
		linkDraftKind.value = 'web'
		linkDraftVisible.value = false
		stageLinksUpdate('immediate')
	}

	function removeLink(index: number) {
		if (index < 0 || index >= linksLocal.value.length) return
		linksLocal.value.splice(index, 1)
		stageLinksUpdate('immediate')
	}

	function clearLinkValidationError(index?: number) {
		if (index === undefined || linkValidationErrorIndex.value === index) {
			linkValidationErrorIndex.value = null
		}
	}

	function onPriorityChange(value: ProjectPriorityValue) {
		const project = currentProject.value
		if (!project || suppressAutosave.value) return
		if (value === project.priority) return
		queueImmediateUpdate({ priority: value })
	}

	function onParentChange(value: string | null) {
		const project = currentProject.value
		if (!project || suppressAutosave.value || isStructureLocked.value) return
		if ((project.parentId ?? null) === value) return
		queueImmediateUpdate({ parentId: value })
	}

	async function onRetrySave() {
		if (!retryPatch) return
		queueImmediateUpdate(retryPatch)
		await processQueuedUpdates()
	}

	watch(
		() => currentProject.value,
		(project) => {
			if (!project) return
			void syncFromProject(project)
		},
		{ immediate: true },
	)

	watchDebounced(
		() => titleLocal.value,
		() => {
			stageTitleUpdate('debounced')
		},
		{ debounce: TEXT_AUTOSAVE_DEBOUNCE, maxWait: TEXT_AUTOSAVE_MAX_WAIT },
	)

	watchDebounced(
		() => noteLocal.value,
		() => {
			stageNoteUpdate('debounced')
		},
		{ debounce: TEXT_AUTOSAVE_DEBOUNCE, maxWait: TEXT_AUTOSAVE_MAX_WAIT },
	)

	watchDebounced(
		() => linksLocal.value,
		() => {
			stageLinksUpdate('debounced')
		},
		{ debounce: TEXT_AUTOSAVE_DEBOUNCE, maxWait: TEXT_AUTOSAVE_MAX_WAIT, deep: true },
	)

	watch(
		() => priorityLocal.value,
		(nextPriority) => {
			onPriorityChange(nextPriority)
		},
	)

	watch(
		() => parentIdLocal.value,
		(nextParentId) => {
			onParentChange(nextParentId)
		},
	)

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return
		if (!isOpen.value) return
		event.preventDefault()
		void close()
	}

	useEventListener(window, 'keydown', onKeydown)

	return {
		currentProject,
		isOpen,
		titleLocal,
		noteLocal,
		priorityLocal,
		parentIdLocal,
		tagsLocal,
		tagInput,
		linksLocal,
		linkDraftTitle,
		linkDraftUrl,
		linkDraftKind,
		linkDraftVisible,
		linkValidationErrorIndex,
		priorityOptions,
		parentOptions,
		linkKindOptions,
		rootLabel,
		isStructureLocked,
		isSaveStateVisible,
		canRetrySave,
		saveState: computed(() => store.saveState),
		addTag,
		removeTag,
		addLinkDraft,
		confirmLinkDraft,
		removeLink,
		clearLinkValidationError,
		onTitleBlur,
		onTitleCompositionStart,
		onTitleCompositionEnd,
		onNoteBlur,
		onNoteCompositionStart,
		onNoteCompositionEnd,
		onRetrySave,
		flushPendingUpdates,
		close,
	}
}
