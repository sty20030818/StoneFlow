import { listDeletedProjects } from '@/services/api/projects'
import { listDeletedTasks } from '@/services/api/tasks'

import type { TrashProjectDto, TrashTaskDto } from '../model'

export async function listTrashDeletedProjects(spaceId: string): Promise<TrashProjectDto[]> {
	return await listDeletedProjects({ spaceId })
}

export async function listTrashDeletedTasks(spaceId: string): Promise<TrashTaskDto[]> {
	return await listDeletedTasks({ spaceId })
}
