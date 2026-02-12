import type { Ref } from 'vue'
import { useTimeoutFn, watchDebounced } from '@vueuse/core'

import type { LinkDto, LinkInput, TaskDto, UpdateTaskPatch } from '@/services/api/tasks'
import { updateTask } from '@/services/api/tasks'
import type { TaskDoneReasonValue, TaskPriorityValue, TaskStatusValue } from '@/config/task'
import type { useProjectsStore } from '@/stores/projects'
import type { useRefreshSignalsStore } from '@/stores/refresh-signals'
import type { useTaskInspectorStore } from '@/stores/taskInspector'

import type { TaskInspectorState, TextInteractionField } from './useTaskInspectorState'
import {
	areCustomFieldsEqual,
	areLinkPatchesEqual,
	getNextCustomFieldRank,
	normalizeOptionalText,
	normalizeProjectId,
	toCustomFieldsPatch,
	toDeadlineTimestamp,
	toLinkPatch,
} from './taskFieldNormalization'

const TEXT_AUTOSAVE_DEBOUNCE = 600
const TEXT_AUTOSAVE_MAX_WAIT = 2000

function hasPatchValue(patch: UpdateTaskPatch): boolean {
	return Object.keys(patch).length > 0
}

export function useTaskInspectorActions(params: {
	currentTask: Ref<TaskDto | null>
	state: TaskInspectorState
	store: ReturnType<typeof useTaskInspectorStore>
	projectsStore: ReturnType<typeof useProjectsStore>
	refreshSignals: ReturnType<typeof useRefreshSignalsStore>
}) {
	const { currentTask, state, store, projectsStore, refreshSignals } = params

	let stagedPatch: UpdateTaskPatch = {}
	let stagedStorePatch: Partial<TaskDto> = {}
	let queueRunning = false
	let retrySnapshot: { patch: UpdateTaskPatch; storePatch: Partial<TaskDto> } | null = null

	const { start: startSavedTimer, stop: stopSavedTimer } = useTimeoutFn(
		() => {
			state.saveState.value = 'idle'
		},
		1200,
		{ immediate: false },
	)
	const { start: startErrorTimer, stop: stopErrorTimer } = useTimeoutFn(
		() => {
			state.saveState.value = 'idle'
		},
		3000,
		{ immediate: false },
	)

	function clearSaveStateTimer() {
		stopSavedTimer()
		stopErrorTimer()
	}

	function beginSave() {
		state.pendingSaves.value += 1
		state.saveState.value = 'saving'
		clearSaveStateTimer()
	}

	function endSave(ok: boolean) {
		state.pendingSaves.value = Math.max(0, state.pendingSaves.value - 1)
		if (state.pendingSaves.value > 0) return
		clearSaveStateTimer()
		if (ok) {
			state.saveState.value = 'saved'
			startSavedTimer()
			return
		}
		state.saveState.value = 'error'
		startErrorTimer()
	}

	function stageUpdate(patch: UpdateTaskPatch, storePatch: Partial<TaskDto> = {}) {
		if (!hasPatchValue(patch)) return
		stagedPatch = {
			...stagedPatch,
			...patch,
		}
		stagedStorePatch = {
			...stagedStorePatch,
			...storePatch,
		}
	}

	function queueImmediateUpdate(patch: UpdateTaskPatch, storePatch: Partial<TaskDto> = {}) {
		stageUpdate(patch, storePatch)
		void processQueuedUpdates()
	}

	function queueDebouncedUpdate(patch: UpdateTaskPatch, storePatch: Partial<TaskDto> = {}) {
		stageUpdate(patch, storePatch)
		void processQueuedUpdates()
	}

	async function commitUpdateNow(patch: UpdateTaskPatch, storePatch: Partial<TaskDto> = {}): Promise<boolean> {
		if (!currentTask.value || !hasPatchValue(patch)) return true
		beginSave()

		let ok = false
		let lastError: unknown = null
		for (let attempt = 0; attempt < 2; attempt += 1) {
			try {
				await updateTask(currentTask.value.id, patch)
				ok = true
				break
			} catch (error) {
				lastError = error
			}
		}

		if (ok) {
			if (Object.keys(storePatch).length > 0) {
				store.patchTask(storePatch)
			}
			refreshSignals.bumpTask()
			endSave(true)
			return true
		}

		console.error('更新任务失败:', lastError)
		endSave(false)
		return false
	}

	async function processQueuedUpdates() {
		if (queueRunning) return
		queueRunning = true

		try {
			while (hasPatchValue(stagedPatch)) {
				const nextPatch = stagedPatch
				const nextStorePatch = stagedStorePatch
				stagedPatch = {}
				stagedStorePatch = {}

				const ok = await commitUpdateNow(nextPatch, nextStorePatch)
				if (!ok) {
					stageUpdate(nextPatch, nextStorePatch)
					retrySnapshot = {
						patch: { ...stagedPatch },
						storePatch: { ...stagedStorePatch },
					}
					state.retrySaveAvailable.value = true
					break
				}

				retrySnapshot = null
				state.retrySaveAvailable.value = false
			}
		} finally {
			queueRunning = false
		}
	}

	function findInvalidLinkIndex(): number {
		return state.linksLocal.value.findIndex((item) => !item.url.trim())
	}

	function findInvalidCustomFieldIndex(): number {
		return state.customFieldsLocal.value.findIndex((item) => !item.title.trim())
	}

	function shouldSkipDebouncedStage(field: TextInteractionField): boolean {
		return state.suppressAutosave.value || state.textInteraction[field].composing
	}

	function stageTitleUpdate(mode: 'debounced' | 'immediate') {
		if (!currentTask.value) return
		if (mode === 'debounced' && shouldSkipDebouncedStage('title')) return
		const nextTitle = state.titleLocal.value.trim()
		if (!nextTitle || nextTitle === currentTask.value.title) return
		const patch = { title: nextTitle }
		if (mode === 'immediate') {
			queueImmediateUpdate(patch, patch)
			return
		}
		queueDebouncedUpdate(patch, patch)
	}

	function stageNoteUpdate(mode: 'debounced' | 'immediate') {
		if (!currentTask.value) return
		if (mode === 'debounced' && shouldSkipDebouncedStage('note')) return
		const nextNote = normalizeOptionalText(state.noteLocal.value)
		if (nextNote === (currentTask.value.note || null)) return
		const patch = { note: nextNote }
		if (mode === 'immediate') {
			queueImmediateUpdate(patch, patch)
			return
		}
		queueDebouncedUpdate(patch, patch)
	}

	function stageLinksUpdate(mode: 'debounced' | 'immediate'): boolean {
		if (!currentTask.value) return false
		if (mode === 'debounced' && shouldSkipDebouncedStage('links')) return false
		const invalidIndex = findInvalidLinkIndex()
		if (invalidIndex >= 0) {
			state.linkValidationErrorIndex.value = invalidIndex
			return false
		}

		state.linkValidationErrorIndex.value = null
		const nextLinks = toLinkPatch(state.linksLocal.value)
		const currentLinks = toLinkPatch(currentTask.value.links ?? [])
		if (areLinkPatchesEqual(nextLinks, currentLinks)) return false
		const storeLinks = buildStoreLinks(currentTask.value.links ?? [], nextLinks)
		if (mode === 'immediate') {
			queueImmediateUpdate({ links: nextLinks }, { links: storeLinks })
			return true
		}
		queueDebouncedUpdate({ links: nextLinks }, { links: storeLinks })
		return true
	}

	function stageCustomFieldsUpdate(mode: 'debounced' | 'immediate'): boolean {
		if (!currentTask.value) return false
		if (mode === 'debounced' && shouldSkipDebouncedStage('customFields')) return false
		const invalidIndex = findInvalidCustomFieldIndex()
		if (invalidIndex >= 0) {
			state.customFieldValidationErrorIndex.value = invalidIndex
			return false
		}

		state.customFieldValidationErrorIndex.value = null
		const nextCustomFields = toCustomFieldsPatch(state.customFieldsLocal.value)
		if (areCustomFieldsEqual(nextCustomFields, currentTask.value.customFields)) return false
		if (mode === 'immediate') {
			queueImmediateUpdate({ customFields: nextCustomFields }, { customFields: nextCustomFields })
			return true
		}
		queueDebouncedUpdate({ customFields: nextCustomFields }, { customFields: nextCustomFields })
		return true
	}

	function registerDebouncedAutosave(source: () => unknown, stage: () => void, deep = false) {
		watchDebounced(source, stage, {
			debounce: TEXT_AUTOSAVE_DEBOUNCE,
			maxWait: TEXT_AUTOSAVE_MAX_WAIT,
			deep,
		})
	}

	registerDebouncedAutosave(
		() => state.titleLocal.value,
		() => stageTitleUpdate('debounced'),
	)
	registerDebouncedAutosave(
		() => state.noteLocal.value,
		() => stageNoteUpdate('debounced'),
	)
	registerDebouncedAutosave(
		() => state.linksLocal.value,
		() => stageLinksUpdate('debounced'),
		true,
	)
	registerDebouncedAutosave(
		() => state.customFieldsLocal.value,
		() => stageCustomFieldsUpdate('debounced'),
		true,
	)

	async function flushPendingUpdates() {
		stageTitleUpdate('immediate')
		stageNoteUpdate('immediate')
		stageLinksUpdate('immediate')
		stageCustomFieldsUpdate('immediate')
		await processQueuedUpdates()
	}

	async function onTitleBlur() {
		state.markTextEditEnd('title')
		await flushPendingUpdates()
	}

	function onTitleFocus() {
		state.markTextEditing('title')
	}

	function onTitleCompositionStart() {
		state.markTextComposing('title')
	}

	function onTitleCompositionEnd() {
		state.markTextCompositionEnd('title')
	}

	async function onStatusChange(value: unknown) {
		const record = value as { value?: string } | null
		const displayStatus = (typeof value === 'string' ? value : record?.value) as TaskStatusValue | undefined
		if (!currentTask.value || !displayStatus) return

		if (displayStatus === 'done') {
			const nextReason = state.doneReasonLocal.value ?? 'completed'
			queueImmediateUpdate(
				{ status: 'done', doneReason: nextReason },
				{
					status: 'done',
					doneReason: nextReason,
					completedAt: currentTask.value.completedAt ?? Date.now(),
				},
			)
			await processQueuedUpdates()
			state.statusLocal.value = 'done'
			state.doneReasonLocal.value = nextReason
			return
		}

		queueImmediateUpdate({ status: 'todo', doneReason: null }, { status: 'todo', doneReason: null, completedAt: null })
		await processQueuedUpdates()
		state.statusLocal.value = 'todo'
	}

	function onStatusSegmentClick(value: TaskStatusValue) {
		if (state.statusLocal.value === value) return
		void onStatusChange(value)
	}

	async function onDoneReasonChange(value: TaskDoneReasonValue) {
		if (!currentTask.value || state.statusLocal.value !== 'done') return
		if (state.doneReasonLocal.value === value) return
		queueImmediateUpdate({ doneReason: value }, { doneReason: value })
		await processQueuedUpdates()
		state.doneReasonLocal.value = value
	}

	async function onPriorityChange(value: TaskPriorityValue) {
		if (!currentTask.value || value === state.priorityLocal.value) return
		queueImmediateUpdate({ priority: value }, { priority: value })
		await processQueuedUpdates()
		state.priorityLocal.value = value
	}

	async function onDeadlineChange() {
		if (!currentTask.value) return
		const nextDeadlineAt = toDeadlineTimestamp(state.deadlineLocal.value)
		if ((currentTask.value.deadlineAt ?? null) === nextDeadlineAt) return
		queueImmediateUpdate({ deadlineAt: nextDeadlineAt }, { deadlineAt: nextDeadlineAt })
		await processQueuedUpdates()
	}

	async function onDeadlineClear() {
		state.deadlineLocal.value = ''
		await onDeadlineChange()
	}

	function addTag() {
		const tag = state.tagInput.value.trim()
		if (tag && !state.tagsLocal.value.includes(tag)) {
			state.tagsLocal.value.push(tag)
			state.tagInput.value = ''
			void onTagsChange()
		}
	}

	function removeTag(tag: string) {
		state.tagsLocal.value = state.tagsLocal.value.filter((t) => t !== tag)
		void onTagsChange()
	}

	function onTagInputBlur() {
		if (state.tagInput.value.trim()) {
			addTag()
		}
	}

	async function onTagsChange() {
		if (!currentTask.value) return
		queueImmediateUpdate({ tags: state.tagsLocal.value }, { tags: state.tagsLocal.value })
		await processQueuedUpdates()
	}

	async function onSpaceChange(value: string) {
		if (!currentTask.value || value === currentTask.value.spaceId) return
		state.spaceIdLocal.value = value
		state.projectIdLocal.value = null
		await projectsStore.load(value)

		queueImmediateUpdate({ spaceId: value, projectId: null }, { spaceId: value, projectId: null })
		await processQueuedUpdates()
	}

	async function onProjectChange(value: string | null) {
		if (!currentTask.value) return
		const nextProjectId = normalizeProjectId(value)
		if ((currentTask.value.projectId ?? null) === nextProjectId) return
		state.projectIdLocal.value = nextProjectId

		queueImmediateUpdate({ projectId: nextProjectId }, { projectId: nextProjectId })
		await processQueuedUpdates()
	}

	async function onNoteBlur() {
		state.markTextEditEnd('note')
		await flushPendingUpdates()
	}

	function onNoteFocus() {
		state.markTextEditing('note')
	}

	function onNoteCompositionStart() {
		state.markTextComposing('note')
	}

	function onNoteCompositionEnd() {
		state.markTextCompositionEnd('note')
	}

	function addLink(): boolean {
		const url = state.linkDraftUrl.value.trim()
		if (!url) return false
		const title = state.linkDraftTitle.value.trim()
		state.linksLocal.value.push({
			title,
			url,
			kind: state.linkDraftKind.value,
		})
		state.linkDraftTitle.value = ''
		state.linkDraftUrl.value = ''
		state.linkDraftKind.value = 'web'
		state.linkDraftVisible.value = false
		stageLinksUpdate('immediate')
		void processQueuedUpdates()
		return true
	}

	function addLinkDraft() {
		state.linkDraftVisible.value = true
	}

	function removeLink(index: number) {
		if (index < 0 || index >= state.linksLocal.value.length) return
		state.linksLocal.value.splice(index, 1)
		stageLinksUpdate('immediate')
		void processQueuedUpdates()
	}

	function clearLinkValidationError(index?: number) {
		if (index === undefined || state.linkValidationErrorIndex.value === index) {
			state.linkValidationErrorIndex.value = null
		}
	}

	function onLinksEditStart() {
		state.markTextEditing('links')
	}

	function onLinksEditEnd() {
		state.markTextEditEnd('links')
	}

	function onLinksCompositionStart() {
		state.markTextComposing('links')
	}

	function onLinksCompositionEnd() {
		state.markTextCompositionEnd('links')
	}

	function addCustomField() {
		state.customFieldDraftVisible.value = true
		if (!state.customFieldDraftTitle.value.trim() && !state.customFieldDraftValue.value.trim()) {
			state.customFieldDraftTitle.value = ''
			state.customFieldDraftValue.value = ''
		}
	}

	function confirmCustomField(): boolean {
		const title = state.customFieldDraftTitle.value.trim()
		if (!title) return false
		const rank = getNextCustomFieldRank(state.customFieldsLocal.value)
		const value = state.customFieldDraftValue.value.trim()
		state.customFieldsLocal.value.push({
			rank,
			title,
			value,
		})
		state.customFieldDraftTitle.value = ''
		state.customFieldDraftValue.value = ''
		state.customFieldDraftVisible.value = false
		stageCustomFieldsUpdate('immediate')
		void processQueuedUpdates()
		return true
	}

	function removeCustomField(index: number) {
		if (index < 0 || index >= state.customFieldsLocal.value.length) return
		state.customFieldsLocal.value.splice(index, 1)
		stageCustomFieldsUpdate('immediate')
		void processQueuedUpdates()
	}

	function clearCustomFieldValidationError(index?: number) {
		if (index === undefined || state.customFieldValidationErrorIndex.value === index) {
			state.customFieldValidationErrorIndex.value = null
		}
	}

	function onCustomFieldsEditStart() {
		state.markTextEditing('customFields')
	}

	function onCustomFieldsEditEnd() {
		state.markTextEditEnd('customFields')
	}

	function onCustomFieldsCompositionStart() {
		state.markTextComposing('customFields')
	}

	function onCustomFieldsCompositionEnd() {
		state.markTextCompositionEnd('customFields')
	}

	async function onRetrySave() {
		if (!retrySnapshot) return
		queueImmediateUpdate(retrySnapshot.patch, retrySnapshot.storePatch)
		await processQueuedUpdates()
	}

	function toggleTimeline() {
		state.timelineCollapsed.value = !state.timelineCollapsed.value
	}

	function resetTextInteractionState() {
		state.resetTextInteractionState()
	}

	function buildStoreLinks(currentLinks: LinkDto[], nextLinks: LinkInput[]): LinkDto[] {
		const byId = new Map(currentLinks.map((item) => [item.id, item]))
		const now = Date.now()
		return nextLinks.map((item, index) => {
			const existing = item.id ? byId.get(item.id) : undefined
			const id = existing?.id ?? item.id ?? `local-link-${now}-${index}`
			return {
				id,
				title: item.title,
				url: item.url,
				kind: item.kind,
				rank: existing?.rank ?? index,
				createdAt: existing?.createdAt ?? now,
				updatedAt: now,
			}
		})
	}

	return {
		onTitleBlur,
		onTitleFocus,
		onTitleCompositionStart,
		onTitleCompositionEnd,
		onStatusSegmentClick,
		onDoneReasonChange,
		onPriorityChange,
		onDeadlineChange,
		onDeadlineClear,
		addTag,
		removeTag,
		onTagInputBlur,
		addLinkDraft,
		addLink,
		removeLink,
		clearLinkValidationError,
		addCustomField,
		confirmCustomField,
		removeCustomField,
		clearCustomFieldValidationError,
		onSpaceChange,
		onProjectChange,
		onNoteBlur,
		onNoteFocus,
		onNoteCompositionStart,
		onNoteCompositionEnd,
		onLinksEditStart,
		onLinksEditEnd,
		onLinksCompositionStart,
		onLinksCompositionEnd,
		onCustomFieldsEditStart,
		onCustomFieldsEditEnd,
		onCustomFieldsCompositionStart,
		onCustomFieldsCompositionEnd,
		onRetrySave,
		flushPendingUpdates,
		resetTextInteractionState,
		toggleTimeline,
	}
}
