import { createTask, createTaskWithPatch, updateTask } from '@/infra/api/tasks'

import {
	mapCreateFlowTaskDtoToDomain,
	mapCreateFlowTaskPatchToDto,
	type CreateFlowTask,
	type CreateTaskArgs,
	type CreateTaskWithPatchArgs,
	type UpdateTaskPatch,
} from '../model'

export async function createFlowTask(args: CreateTaskArgs): Promise<CreateFlowTask> {
	const task = await createTask(args)
	return mapCreateFlowTaskDtoToDomain(task)
}

export async function createFlowTaskWithPatch(args: CreateTaskWithPatchArgs): Promise<CreateFlowTask> {
	const task = await createTaskWithPatch(args)
	return mapCreateFlowTaskDtoToDomain(task)
}

export async function updateFlowTask(taskId: string, patch: UpdateTaskPatch): Promise<void> {
	await updateTask(taskId, mapCreateFlowTaskPatchToDto(patch))
}
