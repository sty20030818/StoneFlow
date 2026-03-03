import {
	completeTask,
	deleteTasks,
	rebalanceRanks,
	reorderTask,
	updateTask,
	type UpdateTaskPatch,
} from '@/services/api/tasks'

export type WorkspaceTaskUpdatePatch = UpdateTaskPatch

export async function completeWorkspaceTask(taskId: string): Promise<void> {
	await completeTask(taskId)
}

export async function updateWorkspaceTask(taskId: string, patch: WorkspaceTaskUpdatePatch): Promise<void> {
	await updateTask(taskId, patch)
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
