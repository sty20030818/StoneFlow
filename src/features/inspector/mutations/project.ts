import {
	archiveProject,
	deleteProject,
	restoreProject,
	unarchiveProject,
	updateProject,
} from '@/services/api/projects'

import { mapInspectorProjectPatchToDto, type InspectorProjectPatch } from '../model'

export async function updateInspectorProject(projectId: string, patch: InspectorProjectPatch): Promise<void> {
	await updateProject(projectId, mapInspectorProjectPatchToDto(patch))
}

export async function deleteInspectorProject(projectId: string): Promise<void> {
	await deleteProject(projectId)
}

export async function restoreInspectorProject(projectId: string): Promise<void> {
	await restoreProject(projectId)
}

export async function archiveInspectorProject(projectId: string): Promise<void> {
	await archiveProject(projectId)
}

export async function unarchiveInspectorProject(projectId: string): Promise<void> {
	await unarchiveProject(projectId)
}
