import { getDefaultProject } from '@/infra/api/projects'

import { mapCreateFlowProjectDtoToDomain, type CreateFlowProject } from './model'

export async function getCreateFlowDefaultProject(spaceId: string): Promise<CreateFlowProject> {
	const project = await getDefaultProject(spaceId)
	return mapCreateFlowProjectDtoToDomain(project)
}
