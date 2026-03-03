import { getDefaultProject } from '@/services/api/projects'

export async function getCreateFlowDefaultProject(spaceId: string) {
	return await getDefaultProject(spaceId)
}
