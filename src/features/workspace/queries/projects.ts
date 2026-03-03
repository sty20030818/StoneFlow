import { listProjects } from '@/services/api/projects'

import { mapWorkspaceProjectsDtoToDomain, type WorkspaceProject } from '../model'

export async function listWorkspaceProjects(spaceId: string): Promise<WorkspaceProject[]> {
	const projects = await listProjects({ spaceId })
	return mapWorkspaceProjectsDtoToDomain(projects)
}
