import { completeTask, deleteTasks, rebalanceRanks, reorderTask, updateTask } from '@/infra/api/tasks'

import { mapWorkspaceTaskPatchToDto, type WorkspaceTaskPatch } from '../shared/model'

export type WorkspaceTaskUpdatePatch = WorkspaceTaskPatch

export async function completeWorkspaceTask(taskId: string): Promise<void> {
	await completeTask(taskId)
}

export async function updateWorkspaceTask(taskId: string, patch: WorkspaceTaskUpdatePatch): Promise<void> {
	await updateTask(taskId, mapWorkspaceTaskPatchToDto(patch))
}

export async function deleteWorkspaceTasks(taskIds: string[]): Promise<number> {
	return await deleteTasks(taskIds)
}

export async function reorderWorkspaceTask(taskId: string, newRank: number): Promise<void> {
	await reorderTask(taskId, newRank)
}

export async function rebalanceWorkspaceTaskRanks(taskIds: string[], step = 1024): Promise<void> {
	await rebalanceRanks(taskIds, step)
}
