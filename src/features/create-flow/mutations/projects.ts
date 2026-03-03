import { createProject } from '@/services/api/projects'

import type { CreateProjectArgs, ProjectDto } from '../model'

export async function createFlowProject(args: CreateProjectArgs): Promise<ProjectDto> {
	return await createProject(args)
}
