import { updateTask } from '@/services/api/tasks'

import { mapInspectorTaskPatchToDto, type InspectorTaskPatch } from '../model'

export async function updateInspectorTask(taskId: string, patch: InspectorTaskPatch): Promise<void> {
	await updateTask(taskId, mapInspectorTaskPatchToDto(patch))
}
