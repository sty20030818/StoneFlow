import { updateTask, type UpdateTaskPatch } from '@/services/api/tasks'

export type InspectorTaskPatch = UpdateTaskPatch

export async function updateInspectorTask(taskId: string, patch: InspectorTaskPatch): Promise<void> {
	await updateTask(taskId, patch)
}
