import { listProjects } from '@/infra/api/projects'

import { mapWorkspaceProjectsDtoToDomain, type WorkspaceProject } from '../shared/model'

export async function listWorkspaceProjects(spaceId: string): Promise<WorkspaceProject[]> {
	const projects = await listProjects({ spaceId })
	return mapWorkspaceProjectsDtoToDomain(projects)
}
