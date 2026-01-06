import { tauriInvoke } from '@/services/tauri/invoke'

export type ProjectDto = {
	id: string
	space_id: string
	name: string
	status: 'active' | 'archived' | string
	created_at: number
	updated_at: number
}

export async function listProjects(spaceId?: string): Promise<ProjectDto[]> {
	if (spaceId) {
		return await tauriInvoke<ProjectDto[]>('list_projects', { spaceId })
	}
	return await tauriInvoke<ProjectDto[]>('list_projects')
}

export async function createProject(spaceId: string, name: string): Promise<ProjectDto> {
	return await tauriInvoke<ProjectDto>('create_project', {
		spaceId,
		name,
	})
}
