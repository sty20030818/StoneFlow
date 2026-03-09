import { useI18n } from 'vue-i18n'
import { useEventListener, watchDebounced } from '@vueuse/core'
import { computed, reactive, ref, watch } from 'vue'

import { PROJECT_PRIORITY_OPTIONS, type ProjectPriorityValue, isDefaultProjectId } from '@/config/project'
import { usePatchQueue } from '../shared'
import {
	archiveInspectorProject,
	deleteInspectorProject,
	restoreInspectorProject,
	unarchiveInspectorProject,
	updateInspectorProject,
} from '../../mutations'
import type { InspectorLink, InspectorLinkInput, InspectorProject, InspectorProjectPatch } from '../../model'
import {
	getWorkspaceProjectById,
	getWorkspaceProjectsSnapshot,
	invalidateWorkspaceTaskAndProjectQueries,
	invalidateWorkspaceProjectQueries,
	patchWorkspaceProjectSnapshot,
	refreshWorkspaceProjectsQuery,
	useSpaceProjectsState,
	type WorkspaceProject,
} from '@/features/workspace'
import { SPACE_OPTIONS } from '@/config/space'
import { useProjectInspectorStore } from '@/stores/projectInspector'
import { resolveErrorMessage } from '@/utils/error-message'
import { buildDrawerLinkKindOptions } from '../../ui/InspectorDrawer/shared/constants'

type ParentProjectOption = {
	value: string | null
	label: string
	depth: number
}

type ProjectLinkFormItem = {
	id?: string
	title: string
	url: string
	kind: InspectorLink['kind']
}

type ProjectPatchQueuePayload = {
	spaceId: string
	patch: InspectorProjectPatch
}

const TEXT_AUTOSAVE_DEBOUNCE = 600
const TEXT_AUTOSAVE_MAX_WAIT = 2000

export function useProjectInspectorDrawer() {
	const store = useProjectInspectorStore()
	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })

	const currentProject = computed<InspectorProject | null>(() => store.project ?? null)
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
	const spaceIdLocal = ref('')
	const parentIdLocal = ref<string | null>(null)
	const tagsLocal = ref<string[]>([])
	const tagInput = ref('')
	const linksLocal = ref<ProjectLinkFormItem[]>([])
	const linkDraftTitle = ref('')
	const linkDraftUrl = ref('')
	const linkDraftKind = ref<InspectorLink['kind']>('web')
	const linkDraftVisible = ref(false)
	const linkValidationErrorIndex = ref<number | null>(null)

	const textInteraction = reactive({
		titleComposing: false,
		noteComposing: false,
		titleEditing: false,
		noteEditing: false,
		linkComposingCount: 0,
		linkEditingCount: 0,
	})
	const lifecycleState = reactive({
		deleting: false,
		restoring: false,
		archiving: false,
		unarchiving: false,
	})
	const suppressAutosave = ref(false)
	const parentOptions = ref<ParentProjectOption[]>([{ value: null, label: t('common.labels.projectRoot'), depth: 0 }])
	const spaceProjectsState = useSpaceProjectsState(spaceIdLocal, {
		enabled: computed(() => Boolean(currentProject.value) && Boolean(spaceIdLocal.value)),
	})

	let syncTicket = 0

	const priorityOptions = PROJECT_PRIORITY_OPTIONS
	const spaceOptions = SPACE_OPTIONS
	const linkKindOptions = computed(() => buildDrawerLinkKindOptions(t))
	const rootLabel = computed(() => t('common.labels.projectRoot'))

	const isStructureLocked = computed(() => {
		const project = currentProject.value
		if (!project) return false
		return isDefaultProjectId(project.id)
	})

	function getCurrentProjectId(): string | null {
		return currentProject.value?.id ?? null
	}

	function hasPatchValue(patch: InspectorProjectPatch): boolean {
		return Object.keys(patch).length > 0
	}

	const patchQueue = usePatchQueue<string, ProjectPatchQueuePayload>({
		createEmptyPatch: () => ({
			spaceId: '',
			patch: {},
		}),
		hasPatchValue: (payload) => payload.spaceId.length > 0 && hasPatchValue(payload.patch),
		mergePatch: (current, next) => ({
			spaceId: current.spaceId || next.spaceId,
			patch: {
				...current.patch,
				...next.patch,
			},
		}),
		clonePatch: (payload) => ({
			spaceId: payload.spaceId,
			patch: { ...payload.patch },
		}),
		commitPatch: (projectId, payload) => commitUpdateNow(projectId, payload),
		isContextActive: (projectId) => getCurrentProjectId() === projectId,
		onDiscardedPatch: (projectId) => {
			console.warn('[ProjectInspector] Discarded patch due to context mismatch:', {
				activeProjectId: getCurrentProjectId(),
				bucketProjectId: projectId,
			})
		},
	})

	const isSaveStateVisible = computed(() => patchQueue.saveState.value !== 'idle')
	const canRetrySave = computed(() => patchQueue.retrySaveAvailable.value)
	const canDeleteProject = computed(() => {
		const project = currentProject.value
		if (!project) return false
		return project.deletedAt === null
	})
	const canRestoreProject = computed(() => {
		const project = currentProject.value
		if (!project) return false
		return project.deletedAt !== null
	})
	const canArchiveProject = computed(() => {
		const project = currentProject.value
		if (!project || project.deletedAt !== null) return false
		return project.archivedAt === null
	})
	const canUnarchiveProject = computed(() => {
		const project = currentProject.value
		if (!project || project.deletedAt !== null) return false
		return project.archivedAt !== null
	})

	function getProjectsOfSpace(spaceId: string): WorkspaceProject[] {
		if (spaceId === spaceIdLocal.value) {
			return spaceProjectsState.projects.value
		}
		return getWorkspaceProjectsSnapshot(spaceId)
	}

	const hasChildProjects = computed(() => {
		const project = currentProject.value
		if (!project) return false
		return getProjectsOfSpace(project.spaceId).some((item) => item.parentId === project.id)
	})
	const isLifecycleBusy = computed(() => {
		return lifecycleState.deleting || lifecycleState.restoring || lifecycleState.archiving || lifecycleState.unarchiving
	})

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

	function normalizeLinks(values: ProjectLinkFormItem[]): InspectorLinkInput[] {
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

	function toLinkFormItems(links: InspectorLink[]): ProjectLinkFormItem[] {
		return links.map((item) => ({
			id: item.id,
			title: item.title,
			url: item.url,
			kind: item.kind,
		}))
	}

	function withAutosaveSuppressed<T>(fn: () => T): T {
		suppressAutosave.value = true
		try {
			return fn()
		} finally {
			suppressAutosave.value = false
		}
	}

	function shouldForceRefreshAfterCommit(patch: InspectorProjectPatch): boolean {
		return patch.title !== undefined || patch.parentId !== undefined || patch.spaceId !== undefined
	}

	function stageUpdateForCurrentProject(patch: InspectorProjectPatch): boolean {
		const project = currentProject.value
		if (!project || !hasPatchValue(patch)) return false
		patchQueue.setActiveContext(project.id)
		patchQueue.queuePatch(project.id, {
			spaceId: project.spaceId,
			patch,
		})
		return true
	}

	function queueImmediateUpdate(patch: InspectorProjectPatch) {
		stageUpdateForCurrentProject(patch)
	}

	function queueDebouncedUpdate(patch: InspectorProjectPatch) {
		stageUpdateForCurrentProject(patch)
	}

	function patchStoreProject(projectId: string, spaceId: string, patch: InspectorProjectPatch) {
		const draftPatch: Partial<InspectorProject> = {}
		if (patch.title !== undefined) draftPatch.title = patch.title
		if (patch.note !== undefined) draftPatch.note = patch.note
		if (patch.priority !== undefined) draftPatch.priority = patch.priority
		if (patch.spaceId !== undefined) draftPatch.spaceId = patch.spaceId
		if (patch.parentId !== undefined) draftPatch.parentId = patch.parentId
		if (patch.tags !== undefined) draftPatch.tags = patch.tags
		if (!hasPatchValue(draftPatch)) return

		patchWorkspaceProjectSnapshot(spaceId, projectId, draftPatch as Partial<WorkspaceProject>)
		if (currentProject.value?.id === projectId) {
			store.patchProject(draftPatch)
		}
	}

	async function refreshStoreProject(spaceId: string, projectId: string, options: { force?: boolean } = {}) {
		await refreshWorkspaceProjectsQuery(spaceId, { force: options.force ?? false })
		const latest = getWorkspaceProjectById(spaceId, projectId)
		if (currentProject.value?.id !== projectId) return
		store.setProject(latest as InspectorProject | null)
	}

	async function refreshStoreProjectAfterSpaceChange(oldSpaceId: string, newSpaceId: string, projectId: string) {
		await Promise.all([
			refreshWorkspaceProjectsQuery(oldSpaceId, { force: true }),
			refreshWorkspaceProjectsQuery(newSpaceId, { force: true }),
		])
		if (currentProject.value?.id !== projectId) return
		const latest = getWorkspaceProjectById(newSpaceId, projectId)
		store.setProject(latest as InspectorProject | null)
	}

	async function commitUpdateNow(projectId: string, payload: ProjectPatchQueuePayload): Promise<boolean> {
		if (!hasPatchValue(payload.patch)) return true

		const spaceId = payload.spaceId
		const patch = payload.patch
		try {
			await updateInspectorProject(projectId, patch)
			patchStoreProject(projectId, spaceId, patch)
			const targetSpaceId = patch.spaceId ?? spaceId
			if (patch.spaceId && patch.spaceId !== spaceId) {
				void refreshStoreProjectAfterSpaceChange(spaceId, targetSpaceId, projectId)
			} else if (shouldForceRefreshAfterCommit(patch)) {
				void refreshStoreProject(spaceId, projectId, { force: true })
			}
			await invalidateWorkspaceProjectQueries()
			if (patch.spaceId !== undefined) {
				await invalidateWorkspaceTaskAndProjectQueries()
			}
			return true
		} catch (error) {
			console.error('Failed to update project:', error)
			return false
		}
	}

	function collectDescendantIds(projects: InspectorProject[], rootId: string): Set<string> {
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

	function buildParentOptions(project: InspectorProject, targetSpaceId: string): ParentProjectOption[] {
		const projects = getProjectsOfSpace(targetSpaceId).filter((item) => !isDefaultProjectId(item.id))
		const descendants =
			targetSpaceId === project.spaceId ? collectDescendantIds(projects, project.id) : new Set<string>()
		const disallowedIds = new Set<string>([project.id, ...descendants])

		const grouped = new Map<string | null, InspectorProject[]>()
		for (const item of projects) {
			const bucket = grouped.get(item.parentId) ?? []
			bucket.push(item)
			grouped.set(item.parentId, bucket)
		}

		const options: ParentProjectOption[] = [{ value: null, label: t('common.labels.projectRoot'), depth: 0 }]

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

	function resetLocalDraftState() {
		tagInput.value = ''
		linkDraftTitle.value = ''
		linkDraftUrl.value = ''
		linkDraftKind.value = 'web'
		linkDraftVisible.value = false
		linkValidationErrorIndex.value = null
	}

	function syncFromProjectSnapshot(project: InspectorProject, mode: 'reset' | 'incremental') {
		withAutosaveSuppressed(() => {
			if (mode === 'reset' || (!textInteraction.titleEditing && !textInteraction.titleComposing)) {
				titleLocal.value = project.title
			}
			if (mode === 'reset' || (!textInteraction.noteEditing && !textInteraction.noteComposing)) {
				noteLocal.value = project.note ?? ''
			}
			if (mode === 'reset' || textInteraction.linkEditingCount === 0) {
				linksLocal.value = toLinkFormItems(project.links)
			}

			priorityLocal.value = project.priority
			spaceIdLocal.value = project.spaceId
			parentIdLocal.value = project.parentId ?? null
			tagsLocal.value = [...project.tags]

			if (mode === 'reset') {
				resetLocalDraftState()
			}
		})
		parentOptions.value = buildParentOptions(project, spaceIdLocal.value)
	}

	async function syncFromProject(project: InspectorProject, mode: 'reset' | 'incremental') {
		const ticket = ++syncTicket
		await refreshWorkspaceProjectsQuery(project.spaceId)
		if (ticket !== syncTicket) return

		const latest = getWorkspaceProjectById(project.spaceId, project.id)
		const resolved = (latest as InspectorProject | null) ?? project
		if (currentProject.value?.id !== resolved.id) return
		syncFromProjectSnapshot(resolved, mode)
	}

	function onTitleFocus() {
		textInteraction.titleEditing = true
	}

	function onTitleCompositionStart() {
		textInteraction.titleComposing = true
	}

	function onTitleCompositionEnd() {
		textInteraction.titleComposing = false
		void flushPendingUpdates()
	}

	async function onTitleBlur() {
		textInteraction.titleEditing = false
		await flushPendingUpdates()
	}

	function onNoteFocus() {
		textInteraction.noteEditing = true
	}

	function onNoteCompositionStart() {
		textInteraction.noteComposing = true
	}

	function onNoteCompositionEnd() {
		textInteraction.noteComposing = false
		void flushPendingUpdates()
	}

	async function onNoteBlur() {
		textInteraction.noteEditing = false
		await flushPendingUpdates()
	}

	function onLinkFieldFocus() {
		textInteraction.linkEditingCount += 1
	}

	function onLinkFieldBlur() {
		textInteraction.linkEditingCount = Math.max(0, textInteraction.linkEditingCount - 1)
		if (textInteraction.linkEditingCount > 0) return
		void flushPendingUpdates()
	}

	function onLinkCompositionStart() {
		textInteraction.linkComposingCount += 1
	}

	function onLinkCompositionEnd() {
		textInteraction.linkComposingCount = Math.max(0, textInteraction.linkComposingCount - 1)
		if (textInteraction.linkComposingCount > 0) return
		void flushPendingUpdates()
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
		if (
			mode === 'debounced' &&
			(suppressAutosave.value || textInteraction.linkComposingCount > 0 || textInteraction.linkEditingCount > 0)
		) {
			return
		}
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

	function onTagInputBlur() {
		if (tagInput.value.trim()) {
			addTag()
		}
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
		linkValidationErrorIndex.value = null
	}

	function cancelLinkDraft() {
		linkDraftTitle.value = ''
		linkDraftUrl.value = ''
		linkDraftKind.value = 'web'
		linkDraftVisible.value = false
		linkValidationErrorIndex.value = null
	}

	function confirmLinkDraft(): boolean {
		const url = linkDraftUrl.value.trim()
		if (!url) return false
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
		linkValidationErrorIndex.value = null
		stageLinksUpdate('immediate')
		return true
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

	async function onSpaceChange(value: string) {
		const project = currentProject.value
		if (!project || suppressAutosave.value || isStructureLocked.value) return
		if (hasChildProjects.value) {
			toast.add({
				title: t('inspector.project.spaceSwitchBlockedTitle'),
				description: t('inspector.project.spaceSwitchBlocked'),
				color: 'warning',
			})
			return
		}

		const currentParentId = project.parentId ?? null
		const sameSpace = project.spaceId === value
		if (sameSpace && currentParentId === parentIdLocal.value) return

		spaceIdLocal.value = value
		if (!sameSpace) {
			parentIdLocal.value = null
		}

		await refreshWorkspaceProjectsQuery(value)
		parentOptions.value = buildParentOptions(project, value)

		if (sameSpace) {
			if (currentParentId !== parentIdLocal.value) {
				queueImmediateUpdate({ parentId: parentIdLocal.value })
			}
			return
		}
		queueImmediateUpdate({ spaceId: value, parentId: parentIdLocal.value ?? null })
	}

	async function flushPendingUpdates() {
		stageTitleUpdate('immediate')
		stageNoteUpdate('immediate')
		stageLinksUpdate('immediate')

		const project = currentProject.value
		if (!project) return
		await patchQueue.flushPendingPatches(project.id)
	}

	function closeImmediately() {
		patchQueue.clearAll()
		store.close()
	}

	async function runLifecycleAction(action: 'delete' | 'restore' | 'archive' | 'unarchive'): Promise<boolean> {
		const project = currentProject.value
		if (!project || isLifecycleBusy.value) return false

		await flushPendingUpdates()
		switch (action) {
			case 'delete':
				lifecycleState.deleting = true
				break
			case 'restore':
				lifecycleState.restoring = true
				break
			case 'archive':
				lifecycleState.archiving = true
				break
			case 'unarchive':
				lifecycleState.unarchiving = true
				break
		}

		try {
			if (action === 'delete') {
				await deleteInspectorProject(project.id)
				await invalidateWorkspaceTaskAndProjectQueries()
				toast.add({
					title: t('inspector.project.toast.deletedTitle'),
					description: project.title,
					color: 'success',
				})
				closeImmediately()
				return true
			}

			if (action === 'restore') {
				await restoreInspectorProject(project.id)
				await invalidateWorkspaceProjectQueries()
				await refreshStoreProject(project.spaceId, project.id, { force: true })
				toast.add({
					title: t('inspector.project.toast.restoredTitle'),
					description: project.title,
					color: 'success',
				})
				return true
			}

			if (action === 'archive') {
				await archiveInspectorProject(project.id)
				await invalidateWorkspaceProjectQueries()
				await refreshStoreProject(project.spaceId, project.id, { force: true })
				toast.add({
					title: t('inspector.project.toast.archivedTitle'),
					description: project.title,
					color: 'success',
				})
				return true
			}

			await unarchiveInspectorProject(project.id)
			await invalidateWorkspaceProjectQueries()
			await refreshStoreProject(project.spaceId, project.id, { force: true })
			toast.add({
				title: t('inspector.project.toast.unarchivedTitle'),
				description: project.title,
				color: 'success',
			})
			return true
		} catch (error) {
			const description = resolveErrorMessage(error, t)
			const title =
				action === 'delete'
					? t('inspector.project.toast.deleteFailedTitle')
					: action === 'restore'
						? t('inspector.project.toast.restoreFailedTitle')
						: action === 'archive'
							? t('inspector.project.toast.archiveFailedTitle')
							: t('inspector.project.toast.unarchiveFailedTitle')
			toast.add({
				title,
				description,
				color: 'error',
			})
			return false
		} finally {
			lifecycleState.deleting = false
			lifecycleState.restoring = false
			lifecycleState.archiving = false
			lifecycleState.unarchiving = false
		}
	}

	async function deleteCurrentProject() {
		return await runLifecycleAction('delete')
	}

	async function restoreCurrentProject() {
		return await runLifecycleAction('restore')
	}

	async function archiveCurrentProject() {
		return await runLifecycleAction('archive')
	}

	async function unarchiveCurrentProject() {
		return await runLifecycleAction('unarchive')
	}

	async function close() {
		await flushPendingUpdates()
		patchQueue.clearAll()
		store.close()
	}

	async function onRetrySave() {
		await patchQueue.retrySave(getCurrentProjectId())
	}

	watch(
		() => currentProject.value?.id ?? null,
		(projectId) => {
			patchQueue.setActiveContext(projectId)
		},
		{ immediate: true },
	)

	watch(
		() => currentProject.value,
		(project, previousProject) => {
			if (!project) return
			const mode = !previousProject || previousProject.id !== project.id ? 'reset' : 'incremental'
			void syncFromProject(project, mode)
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
		if (!isOpen.value) return
		if (event.isComposing) return
		const key = event.key.toLowerCase()
		if ((event.ctrlKey || event.metaKey) && key === 's') {
			event.preventDefault()
			void flushPendingUpdates()
			return
		}
		if (event.key === 'Escape') {
			event.preventDefault()
			void close()
		}
	}

	useEventListener(window, 'keydown', onKeydown)

	return {
		currentProject,
		isOpen,
		titleLocal,
		noteLocal,
		priorityLocal,
		spaceIdLocal,
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
		spaceOptions,
		parentOptions,
		linkKindOptions,
		rootLabel,
		isStructureLocked,
		isSaveStateVisible,
		canRetrySave,
		canDeleteProject,
		canRestoreProject,
		canArchiveProject,
		canUnarchiveProject,
		hasChildProjects,
		isLifecycleBusy,
		isDeletingProject: computed(() => lifecycleState.deleting),
		isRestoringProject: computed(() => lifecycleState.restoring),
		isArchivingProject: computed(() => lifecycleState.archiving),
		isUnarchivingProject: computed(() => lifecycleState.unarchiving),
		saveState: patchQueue.saveState,
		addTag,
		removeTag,
		onTagInputBlur,
		addLinkDraft,
		cancelLinkDraft,
		confirmLinkDraft,
		removeLink,
		clearLinkValidationError,
		onTitleFocus,
		onTitleBlur,
		onTitleCompositionStart,
		onTitleCompositionEnd,
		onNoteFocus,
		onNoteBlur,
		onNoteCompositionStart,
		onNoteCompositionEnd,
		onLinkFieldFocus,
		onLinkFieldBlur,
		onLinkCompositionStart,
		onLinkCompositionEnd,
		onSpaceChange,
		onRetrySave,
		deleteCurrentProject,
		restoreCurrentProject,
		archiveCurrentProject,
		unarchiveCurrentProject,
		flushPendingUpdates,
		close,
	}
}
