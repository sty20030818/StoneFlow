import type { Ref } from 'vue'
import { useDebounceFn, useTimeoutFn } from '@vueuse/core'

import type { LinkDto, LinkInput, TaskDto, UpdateTaskPatch } from '@/services/api/tasks'
import { updateTask } from '@/services/api/tasks'
import type { TaskDoneReasonValue, TaskPriorityValue, TaskStatusValue } from '@/config/task'
import type { useProjectsStore } from '@/stores/projects'
import type { useRefreshSignalsStore } from '@/stores/refresh-signals'
import type { useTaskInspectorStore } from '@/stores/taskInspector'

import type { TaskInspectorState } from './useTaskInspectorState'
import {
	areCustomFieldsEqual,
	areLinkPatchesEqual,
	normalizeOptionalText,
	normalizeProjectId,
	toCustomFieldsPatch,
	toDeadlineTimestamp,
	toLinkPatch,
} from './taskFieldNormalization'

export function useTaskInspectorActions(params: {
	currentTask: Ref<TaskDto | null>
	state: TaskInspectorState
	store: ReturnType<typeof useTaskInspectorStore>
	projectsStore: ReturnType<typeof useProjectsStore>
	refreshSignals: ReturnType<typeof useRefreshSignalsStore>
}) {
	const { currentTask, state, store, projectsStore, refreshSignals } = params
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

	async function commitUpdate(patch: UpdateTaskPatch, storePatch: Partial<TaskDto> = {}) {
		if (!currentTask.value) return
		beginSave()
		try {
			await updateTask(currentTask.value.id, patch)
			if (Object.keys(storePatch).length > 0) store.patchTask(storePatch)
			refreshSignals.bumpTask()
			endSave(true)
		} catch (error) {
			console.error('更新任务失败:', error)
			endSave(false)
		}
	}

	async function onTitleBlur() {
		if (!currentTask.value) return
		const nextTitle = state.titleLocal.value.trim()
		if (!nextTitle || nextTitle === currentTask.value.title) return
		await commitUpdate({ title: nextTitle }, { title: nextTitle })
	}

	async function onStatusChange(value: unknown) {
		const record = value as { value?: string } | null
		const displayStatus = (typeof value === 'string' ? value : record?.value) as TaskStatusValue | undefined
		if (!currentTask.value || !displayStatus) return

		if (displayStatus === 'done') {
			const nextReason = state.doneReasonLocal.value ?? 'completed'
			await commitUpdate(
				{ status: 'done', doneReason: nextReason },
				{
					status: 'done',
					doneReason: nextReason,
					completedAt: currentTask.value.completedAt ?? Date.now(),
				},
			)
			state.statusLocal.value = 'done'
			state.doneReasonLocal.value = nextReason
			return
		}

		await commitUpdate({ status: 'todo', doneReason: null }, { status: 'todo', doneReason: null, completedAt: null })
		state.statusLocal.value = 'todo'
	}

	function onStatusSegmentClick(value: TaskStatusValue) {
		if (state.statusLocal.value === value) return
		onStatusChange(value)
	}

	async function onDoneReasonChange(value: TaskDoneReasonValue) {
		if (!currentTask.value || state.statusLocal.value !== 'done') return
		if (state.doneReasonLocal.value === value) return
		await commitUpdate({ doneReason: value }, { doneReason: value })
		state.doneReasonLocal.value = value
	}

	async function onPriorityChange(value: TaskPriorityValue) {
		if (!currentTask.value || value === state.priorityLocal.value) return
		await commitUpdate({ priority: value }, { priority: value })
		state.priorityLocal.value = value
	}

	async function onDeadlineChange() {
		if (!currentTask.value) return
		const nextDeadlineAt = toDeadlineTimestamp(state.deadlineLocal.value)
		if ((currentTask.value.deadlineAt ?? null) === nextDeadlineAt) return
		await commitUpdate({ deadlineAt: nextDeadlineAt }, { deadlineAt: nextDeadlineAt })
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
			onTagsChange()
		}
	}

	function removeTag(tag: string) {
		state.tagsLocal.value = state.tagsLocal.value.filter((t) => t !== tag)
		onTagsChange()
	}

	function onTagInputBlur() {
		if (state.tagInput.value.trim()) {
			addTag()
		}
	}

	async function onTagsChange() {
		if (!currentTask.value) return
		await commitUpdate({ tags: state.tagsLocal.value }, { tags: state.tagsLocal.value })
	}

	async function onSpaceChange(value: string) {
		if (!currentTask.value || value === currentTask.value.spaceId) return
		state.spaceIdLocal.value = value
		state.projectIdLocal.value = null
		await projectsStore.load(value)

		await commitUpdate({ spaceId: value, projectId: null }, { spaceId: value, projectId: null })
	}

	async function onProjectChange(value: string | null) {
		if (!currentTask.value) return
		const nextProjectId = normalizeProjectId(value)
		if ((currentTask.value.projectId ?? null) === nextProjectId) return
		state.projectIdLocal.value = nextProjectId

		await commitUpdate({ projectId: nextProjectId }, { projectId: nextProjectId })
	}

	async function onNoteBlur() {
		if (!currentTask.value) return
		const nextNote = normalizeOptionalText(state.noteLocal.value)
		if (nextNote === (currentTask.value.note || null)) return
		await commitUpdate({ note: nextNote }, { note: nextNote })
	}

	function addLink() {
		state.linksLocal.value.push({
			title: '',
			url: '',
			kind: 'web',
		})
		scheduleLinksCommit()
	}

	function removeLink(index: number) {
		if (index < 0 || index >= state.linksLocal.value.length) return
		state.linksLocal.value.splice(index, 1)
		scheduleLinksCommit()
	}

	function addCustomField() {
		state.customFieldsLocal.value.push({
			key: '',
			label: '',
			value: '',
		})
		scheduleCustomFieldsCommit()
	}

	function removeCustomField(index: number) {
		if (index < 0 || index >= state.customFieldsLocal.value.length) return
		state.customFieldsLocal.value.splice(index, 1)
		scheduleCustomFieldsCommit()
	}

	function toggleAdvanced() {
		state.advancedCollapsed.value = !state.advancedCollapsed.value
	}

	async function commitLinks() {
		if (!currentTask.value) return
		const nextLinks = toLinkPatch(state.linksLocal.value)
		const currentLinks = toLinkPatch(currentTask.value.links ?? [])
		if (areLinkPatchesEqual(nextLinks, currentLinks)) return
		const storeLinks = buildStoreLinks(currentTask.value.links ?? [], nextLinks)
		await commitUpdate({ links: nextLinks }, { links: storeLinks })
	}

	async function commitCustomFields() {
		if (!currentTask.value) return
		const nextCustomFields = toCustomFieldsPatch(state.customFieldsLocal.value)
		if (areCustomFieldsEqual(nextCustomFields, currentTask.value.customFields)) return
		await commitUpdate({ customFields: nextCustomFields }, { customFields: nextCustomFields })
	}

	const scheduleLinksCommit = useDebounceFn(() => {
		void commitLinks()
	}, 320)

	const scheduleCustomFieldsCommit = useDebounceFn(() => {
		void commitCustomFields()
	}, 320)

	function onLinksInput() {
		scheduleLinksCommit()
	}

	function onCustomFieldsInput() {
		scheduleCustomFieldsCommit()
	}

	async function onLinksBlur() {
		await commitLinks()
	}

	async function onCustomFieldsBlur() {
		await commitCustomFields()
	}

	function toggleTimeline() {
		state.timelineCollapsed.value = !state.timelineCollapsed.value
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
		commitUpdate,
		onTitleBlur,
		onStatusSegmentClick,
		onDoneReasonChange,
		onPriorityChange,
		onDeadlineChange,
		onDeadlineClear,
		addTag,
		removeTag,
		onTagInputBlur,
		addLink,
		removeLink,
		onLinksInput,
		onLinksBlur,
		addCustomField,
		removeCustomField,
		onCustomFieldsInput,
		onCustomFieldsBlur,
		toggleAdvanced,
		onSpaceChange,
		onProjectChange,
		onNoteBlur,
		toggleTimeline,
	}
}
