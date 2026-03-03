import { createTask, createTaskWithPatch, updateTask } from '@/services/api/tasks'

import type { CreateTaskArgs, CreateTaskWithPatchArgs, TaskDto, UpdateTaskPatch } from '../model'

export async function createFlowTask(args: CreateTaskArgs): Promise<TaskDto> {
	return await createTask(args)
}

export async function createFlowTaskWithPatch(args: CreateTaskWithPatchArgs): Promise<TaskDto> {
	return await createTaskWithPatch(args)
}

export async function updateFlowTask(taskId: string, patch: UpdateTaskPatch): Promise<void> {
	await updateTask(taskId, patch)
}
