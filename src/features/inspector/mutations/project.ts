import {
	archiveProject,
	deleteProject,
	restoreProject,
	unarchiveProject,
	updateProject,
	type UpdateProjectPatch,
} from '@/services/api/projects'

export type InspectorProjectPatch = UpdateProjectPatch

export async function updateInspectorProject(projectId: string, patch: InspectorProjectPatch): Promise<void> {
	await updateProject(projectId, patch)
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
