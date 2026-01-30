import type { Ref } from 'vue'

import type { TaskDto, UpdateTaskPatch } from '@/services/api/tasks'
import { updateTask } from '@/services/api/tasks'
import type { TaskDoneReasonValue, TaskPriorityValue, TaskStatusValue } from '@/config/task'
import type { useRefreshSignalsStore } from '@/stores/refresh-signals'
import type { useTaskInspectorStore } from '@/stores/taskInspector'

import type { TaskInspectorState } from './useTaskInspectorState'

export function useTaskInspectorActions(params: {
	currentTask: Ref<TaskDto | null>
	state: TaskInspectorState
	store: ReturnType<typeof useTaskInspectorStore>
	refreshSignals: ReturnType<typeof useRefreshSignalsStore>
}) {
	const { currentTask, state, store, refreshSignals } = params
	let saveStateTimer: ReturnType<typeof setTimeout> | null = null

	function clearSaveStateTimer() {
		if (saveStateTimer) {
			clearTimeout(saveStateTimer)
			saveStateTimer = null
		}
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
			saveStateTimer = setTimeout(() => {
				state.saveState.value = 'idle'
			}, 1200)
			return
		}
		state.saveState.value = 'error'
		saveStateTimer = setTimeout(() => {
			state.saveState.value = 'idle'
		}, 3000)
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
					done_reason: nextReason,
					completed_at: currentTask.value.completed_at ?? Date.now(),
				},
			)
			state.statusLocal.value = 'done'
			state.doneReasonLocal.value = nextReason
			return
		}

		await commitUpdate({ status: 'todo', doneReason: null }, { status: 'todo', done_reason: null, completed_at: null })
		state.statusLocal.value = 'todo'
	}

	function onStatusSegmentClick(value: TaskStatusValue) {
		if (state.statusLocal.value === value) return
		onStatusChange(value)
	}

	async function onDoneReasonChange(value: TaskDoneReasonValue) {
		if (!currentTask.value || state.statusLocal.value !== 'done') return
		if (state.doneReasonLocal.value === value) return
		await commitUpdate({ doneReason: value }, { done_reason: value })
		state.doneReasonLocal.value = value
	}

	async function onPriorityChange(value: TaskPriorityValue) {
		if (!currentTask.value || value === state.priorityLocal.value) return
		await commitUpdate({ priority: value }, { priority: value })
		state.priorityLocal.value = value
	}

	async function onDeadlineChange() {
		if (!currentTask.value) return
		const val = state.deadlineLocal.value
		if (!val) {
			await commitUpdate({ deadlineAt: null }, { deadline_at: null })
			return
		}
		const date = new Date(val)
		const ts = date.getTime()
		await commitUpdate({ deadlineAt: ts }, { deadline_at: ts })
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
		if (!currentTask.value || value === state.spaceIdLocal.value) return
		state.spaceIdLocal.value = value
		state.projectIdLocal.value = null

		await commitUpdate({ spaceId: value, projectId: null }, { space_id: value, project_id: null })
	}

	async function onProjectChange(value: string | null) {
		if (!currentTask.value || value === state.projectIdLocal.value) return
		state.projectIdLocal.value = value

		await commitUpdate({ projectId: value }, { project_id: value })
	}

	async function onNoteBlur() {
		if (!currentTask.value) return
		const nextNote = state.noteLocal.value.trim() || null
		if (nextNote === (currentTask.value.note || null)) return
		await commitUpdate({ note: nextNote }, { note: nextNote })
	}

	function toggleTimeline() {
		state.timelineCollapsed.value = !state.timelineCollapsed.value
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
		onSpaceChange,
		onProjectChange,
		onNoteBlur,
		toggleTimeline,
	}
}
