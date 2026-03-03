import { invalidateWorkspaceTaskAndProjectQueries } from '@/features/workspace/model'

import type {
	CreateTaskWithPatchArgs,
	CustomFields,
	LinkInput,
	TaskDoneReason,
	TaskDto,
	TaskPriorityValue,
	TaskStatus,
	UpdateTaskPatch,
} from '../model'
import { createFlowTask, createFlowTaskWithPatch, updateFlowTask } from '../mutations'
import { getCreateFlowDefaultProject } from '../queries'

type CreateTaskFromModalInput = {
	spaceId: string
	title: string
	projectId: string | null
	status: TaskStatus
	doneReason: TaskDoneReason
	priority: TaskPriorityValue
	note: string | null
	deadlineAt: number | null
	tags?: string[]
	links?: LinkInput[]
	customFields?: CustomFields | null
}

type CreateInlineTaskInput = {
	spaceId: string
	projectId?: string | null
	title: string
	note?: string | null
	priority?: TaskPriorityValue
}

async function resolveTaskProjectId(spaceId: string, projectId?: string | null): Promise<string | null> {
	if (projectId) return projectId
	try {
		const defaultProject = await getCreateFlowDefaultProject(spaceId)
		return defaultProject.id
	} catch {
		return null
	}
}

export function useTaskCreateWorkflow() {
	async function createTaskFromModal(input: CreateTaskFromModalInput): Promise<TaskDto> {
		const args: CreateTaskWithPatchArgs = {
			spaceId: input.spaceId,
			title: input.title,
			autoStart: false,
			projectId: input.projectId,
			status: input.status,
			doneReason: input.status === 'done' ? input.doneReason : null,
			priority: input.priority,
			note: input.note,
			deadlineAt: input.deadlineAt,
			tags: input.tags,
			links: input.links,
			customFields: input.customFields,
		}

		const task = await createFlowTaskWithPatch(args)
		await invalidateWorkspaceTaskAndProjectQueries()
		return task
	}

	async function createInlineTask(input: CreateInlineTaskInput): Promise<TaskDto> {
		const resolvedProjectId = await resolveTaskProjectId(input.spaceId, input.projectId)
		const nextPriority = input.priority ?? 'P1'

		const task = await createFlowTask({
			spaceId: input.spaceId,
			title: input.title,
			autoStart: false,
			projectId: resolvedProjectId,
		})

		const patch: UpdateTaskPatch = {}
		if (task.priority !== nextPriority) patch.priority = nextPriority
		if (input.note && input.note.trim()) patch.note = input.note.trim()
		if (task.status !== 'todo') patch.status = 'todo'
		if (Object.keys(patch).length > 0) {
			await updateFlowTask(task.id, patch)
			Object.assign(task, patch)
		}

		await invalidateWorkspaceTaskAndProjectQueries()
		return task
	}

	return {
		createTaskFromModal,
		createInlineTask,
	}
}
