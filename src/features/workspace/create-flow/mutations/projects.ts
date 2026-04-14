import { createProject } from '@/infra/api/projects'

import { mapCreateFlowProjectDtoToDomain, type CreateFlowProject, type CreateProjectArgs } from '../model'

export async function createFlowProject(args: CreateProjectArgs): Promise<CreateFlowProject> {
	const project = await createProject(args)
	return mapCreateFlowProjectDtoToDomain(project)
}
