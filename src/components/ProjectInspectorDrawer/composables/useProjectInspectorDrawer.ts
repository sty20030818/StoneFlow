import { useEventListener, useTimeoutFn, watchDebounced } from '@vueuse/core'
import { computed, reactive, ref, watch } from 'vue'

import {
	PROJECT_PRIORITY_OPTIONS,
	PROJECT_ROOT_LABEL,
	type ProjectPriorityValue,
	isDefaultProjectId,
} from '@/config/project'
import { SPACE_OPTIONS } from '@/config/space'
import type { ProjectDto, UpdateProjectPatch } from '@/services/api/projects'
import { archiveProject, deleteProject, restoreProject, unarchiveProject, updateProject } from '@/services/api/projects'
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

type SaveBucket = {
	spaceId: string
	stagedPatch: UpdateProjectPatch
	queueRunning: boolean
}

const TEXT_AUTOSAVE_DEBOUNCE = 600
const TEXT_AUTOSAVE_MAX_WAIT = 2000

const PROJECT_LINK_KIND_OPTIONS: Array<{ value: LinkDto['kind']; label: string }> = [
	{ value: 'web', label: '网页' },
	{ value: 'doc', label: '文档' },
	{ value: 'design', label: '设计稿' },
	{ value: 'repoLocal', label: '本地仓库' },
	{ value: 'repoRemote', label: '远程仓库' },
	{ value: 'other', label: '其他' },
]

export function useProjectInspectorDrawer() {
	const store = useProjectInspectorStore()
	const projectsStore = useProjectsStore()
	const refreshSignals = useRefreshSignalsStore()
	const toast = useToast()

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
	const spaceIdLocal = ref('')
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
	const pendingSaves = ref(0)
	const parentOptions = ref<ParentProjectOption[]>([{ value: null, label: PROJECT_ROOT_LABEL, depth: 0 }])

	const saveBuckets = new Map<string, SaveBucket>()
	const retryPatchByProjectId = new Map<string, UpdateProjectPatch>()
	let syncTicket = 0

	const priorityOptions = PROJECT_PRIORITY_OPTIONS
	const spaceOptions = SPACE_OPTIONS
	const linkKindOptions = PROJECT_LINK_KIND_OPTIONS
	const rootLabel = PROJECT_ROOT_LABEL

	const isStructureLocked = computed(() => {
		const project = currentProject.value
		if (!project) return false
		return isDefaultProjectId(project.id)
	})

	const isSaveStateVisible = computed(() => store.saveState !== 'idle')
	const canRetrySave = computed(() => {
		const projectId = currentProject.value?.id
		if (!projectId) return false
		return retryPatchByProjectId.has(projectId)
	})
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
	const hasChildProjects = computed(() => {
		const project = currentProject.value
		if (!project) return false
		return projectsStore.getProjectsOfSpace(project.spaceId).some((item) => item.parentId === project.id)
	})
	const isLifecycleBusy = computed(() => {
		return lifecycleState.deleting || lifecycleState.restoring || lifecycleState.archiving || lifecycleState.unarchiving
	})

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

	function syncRetrySaveAvailability() {
		store.setRetrySaveAvailable(canRetrySave.value)
	}

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

	function withAutosaveSuppressed<T>(fn: () => T): T {
		suppressAutosave.value = true
		try {
			return fn()
		} finally {
			suppressAutosave.value = false
		}
	}

	function shouldForceRefreshAfterCommit(patch: UpdateProjectPatch): boolean {
		return patch.title !== undefined || patch.parentId !== undefined || patch.spaceId !== undefined
	}

	function getOrCreateSaveBucket(projectId: string, spaceId: string): SaveBucket {
		const existing = saveBuckets.get(projectId)
		if (existing) return existing
		const created: SaveBucket = {
			spaceId,
			stagedPatch: {},
			queueRunning: false,
		}
		saveBuckets.set(projectId, created)
		return created
	}

	function clearProjectBucket(projectId: string) {
		const bucket = saveBuckets.get(projectId)
		if (!bucket) return
		if (bucket.queueRunning) return
		if (hasPatchValue(bucket.stagedPatch)) return
		if (retryPatchByProjectId.has(projectId)) return
		saveBuckets.delete(projectId)
	}

	function cleanupInactiveBuckets(activeProjectId: string | null) {
		for (const [projectId, bucket] of saveBuckets.entries()) {
			if (projectId === activeProjectId) continue
			if (bucket.queueRunning) continue
			if (hasPatchValue(bucket.stagedPatch)) {
				console.warn('[ProjectInspector] 丢弃非激活项目待提交补丁:', {
					projectId,
				})
			}
			saveBuckets.delete(projectId)
		}

		for (const projectId of retryPatchByProjectId.keys()) {
			if (projectId === activeProjectId) continue
			retryPatchByProjectId.delete(projectId)
		}
	}

	function stageUpdateForCurrentProject(patch: UpdateProjectPatch): { projectId: string; spaceId: string } | null {
		const project = currentProject.value
		if (!project || !hasPatchValue(patch)) return null
		const bucket = getOrCreateSaveBucket(project.id, project.spaceId)
		bucket.stagedPatch = {
			...bucket.stagedPatch,
			...patch,
		}
		return {
			projectId: project.id,
			spaceId: project.spaceId,
		}
	}

	function queueImmediateUpdate(patch: UpdateProjectPatch) {
		const context = stageUpdateForCurrentProject(patch)
		if (!context) return
		void processQueuedUpdates(context.projectId, context.spaceId)
	}

	function queueDebouncedUpdate(patch: UpdateProjectPatch) {
		const context = stageUpdateForCurrentProject(patch)
		if (!context) return
		void processQueuedUpdates(context.projectId, context.spaceId)
	}

	function patchStoreProject(projectId: string, spaceId: string, patch: UpdateProjectPatch) {
		const draftPatch: Partial<ProjectDto> = {}
		if (patch.title !== undefined) draftPatch.title = patch.title
		if (patch.note !== undefined) draftPatch.note = patch.note
		if (patch.priority !== undefined) draftPatch.priority = patch.priority
		if (patch.spaceId !== undefined) draftPatch.spaceId = patch.spaceId
		if (patch.parentId !== undefined) draftPatch.parentId = patch.parentId
		if (patch.tags !== undefined) draftPatch.tags = patch.tags
		if (!hasPatchValue(draftPatch)) return

		projectsStore.patchProject(spaceId, projectId, draftPatch)
		if (currentProject.value?.id === projectId) {
			store.patchProject(draftPatch)
		}
	}

	async function refreshStoreProject(spaceId: string, projectId: string, options: { force?: boolean } = {}) {
		await projectsStore.load(spaceId, { force: options.force ?? false })
		const latest = projectsStore.getProjectById(spaceId, projectId)
		if (currentProject.value?.id !== projectId) return
		store.setProject(latest)
	}

	async function refreshStoreProjectAfterSpaceChange(oldSpaceId: string, newSpaceId: string, projectId: string) {
		await Promise.all([
			projectsStore.load(oldSpaceId, { force: true }),
			projectsStore.load(newSpaceId, { force: true }),
		])
		if (currentProject.value?.id !== projectId) return
		const latest = projectsStore.getProjectById(newSpaceId, projectId)
		store.setProject(latest)
	}

	async function commitUpdateNow(projectId: string, spaceId: string, patch: UpdateProjectPatch): Promise<boolean> {
		if (!hasPatchValue(patch)) return true

		const activeProjectId = currentProject.value?.id ?? null
		if (activeProjectId !== projectId) {
			console.warn('[ProjectInspector] 丢弃上下文不一致补丁:', {
				activeProjectId,
				bucketProjectId: projectId,
			})
			return true
		}

		beginSave()
		try {
			await updateProject(projectId, patch)
			patchStoreProject(projectId, spaceId, patch)
			const targetSpaceId = patch.spaceId ?? spaceId
			if (patch.spaceId && patch.spaceId !== spaceId) {
				void refreshStoreProjectAfterSpaceChange(spaceId, targetSpaceId, projectId)
			} else if (shouldForceRefreshAfterCommit(patch)) {
				void refreshStoreProject(spaceId, projectId, { force: true })
			}
			if (patch.spaceId !== undefined) {
				refreshSignals.bumpTask()
			}
			refreshSignals.bumpProject()
			retryPatchByProjectId.delete(projectId)
			syncRetrySaveAvailability()
			endSave(true)
			return true
		} catch (error) {
			console.error('更新项目失败:', error)
			retryPatchByProjectId.set(projectId, { ...patch })
			syncRetrySaveAvailability()
			endSave(false)
			return false
		}
	}

	async function processQueuedUpdates(projectId: string, spaceId: string) {
		const bucket = getOrCreateSaveBucket(projectId, spaceId)
		if (bucket.queueRunning) return
		bucket.queueRunning = true

		try {
			while (hasPatchValue(bucket.stagedPatch)) {
				const currentPatch = bucket.stagedPatch
				bucket.stagedPatch = {}
				const ok = await commitUpdateNow(projectId, bucket.spaceId, currentPatch)
				if (!ok) {
					bucket.stagedPatch = {
						...currentPatch,
						...bucket.stagedPatch,
					}
					break
				}
			}
		} finally {
			bucket.queueRunning = false
			if (hasPatchValue(bucket.stagedPatch) && currentProject.value?.id === projectId) {
				void processQueuedUpdates(projectId, bucket.spaceId)
				return
			}
			clearProjectBucket(projectId)
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

	function buildParentOptions(project: ProjectDto, targetSpaceId: string): ParentProjectOption[] {
		const projects = projectsStore.getProjectsOfSpace(targetSpaceId).filter((item) => !isDefaultProjectId(item.id))
		const descendants =
			targetSpaceId === project.spaceId ? collectDescendantIds(projects, project.id) : new Set<string>()
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

	function resetLocalDraftState() {
		tagInput.value = ''
		linkDraftTitle.value = ''
		linkDraftUrl.value = ''
		linkDraftKind.value = 'web'
		linkDraftVisible.value = false
		linkValidationErrorIndex.value = null
	}

	function syncFromProjectSnapshot(project: ProjectDto, mode: 'reset' | 'incremental') {
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

	async function syncFromProject(project: ProjectDto, mode: 'reset' | 'incremental') {
		const ticket = ++syncTicket
		await projectsStore.load(project.spaceId)
		if (ticket !== syncTicket) return

		const latest = projectsStore.getProjectById(project.spaceId, project.id)
		const resolved = latest ?? project
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
		if (mode === 'debounced' && (suppressAutosave.value || textInteraction.linkComposingCount > 0)) return
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

	function cancelLinkDraft() {
		linkDraftTitle.value = ''
		linkDraftUrl.value = ''
		linkDraftKind.value = 'web'
		linkDraftVisible.value = false
		linkValidationErrorIndex.value = null
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

	async function onSpaceChange(value: string) {
		const project = currentProject.value
		if (!project || suppressAutosave.value || isStructureLocked.value) return
		if (hasChildProjects.value) {
			toast.add({
				title: '暂不支持切换 Space',
				description: '当前项目存在子项目，请先调整层级后再迁移。',
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

		await projectsStore.load(value)
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
		await processQueuedUpdates(project.id, project.spaceId)
	}

	function closeImmediately() {
		store.close()
		cleanupInactiveBuckets(null)
		syncRetrySaveAvailability()
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
				await deleteProject(project.id)
				refreshSignals.bumpTask()
				refreshSignals.bumpProject()
				toast.add({
					title: '项目已移入回收站',
					description: project.title,
					color: 'success',
				})
				closeImmediately()
				return true
			}

			if (action === 'restore') {
				await restoreProject(project.id)
				refreshSignals.bumpProject()
				await refreshStoreProject(project.spaceId, project.id, { force: true })
				toast.add({
					title: '项目已恢复',
					description: project.title,
					color: 'success',
				})
				return true
			}

			if (action === 'archive') {
				await archiveProject(project.id)
				refreshSignals.bumpProject()
				await refreshStoreProject(project.spaceId, project.id, { force: true })
				toast.add({
					title: '项目已归档',
					description: project.title,
					color: 'success',
				})
				return true
			}

			await unarchiveProject(project.id)
			refreshSignals.bumpProject()
			await refreshStoreProject(project.spaceId, project.id, { force: true })
			toast.add({
				title: '已取消归档',
				description: project.title,
				color: 'success',
			})
			return true
		} catch (error) {
			const description = error instanceof Error ? error.message : '未知错误'
			const title =
				action === 'delete'
					? '删除项目失败'
					: action === 'restore'
						? '恢复项目失败'
						: action === 'archive'
							? '归档项目失败'
							: '取消归档失败'
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
		store.close()
		const activeProjectId = currentProject.value?.id ?? null
		cleanupInactiveBuckets(activeProjectId)
		syncRetrySaveAvailability()
	}

	async function onRetrySave() {
		const project = currentProject.value
		if (!project) return
		const retryPatch = retryPatchByProjectId.get(project.id)
		if (!retryPatch) return
		queueImmediateUpdate(retryPatch)
		await processQueuedUpdates(project.id, project.spaceId)
	}

	watch(
		() => currentProject.value?.id ?? null,
		(projectId) => {
			cleanupInactiveBuckets(projectId)
			syncRetrySaveAvailability()
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
		saveState: computed(() => store.saveState),
		addTag,
		removeTag,
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
