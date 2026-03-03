import { listProjects, type ProjectDto } from '@/services/api/projects'

export async function listWorkspaceProjects(spaceId: string): Promise<ProjectDto[]> {
	return await listProjects({ spaceId })
}
