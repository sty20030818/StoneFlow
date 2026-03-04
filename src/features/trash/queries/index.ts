import { listDeletedProjects } from '@/services/api/projects'
import { listDeletedTasks } from '@/services/api/tasks'

import {
	mapTrashProjectsDtoToDomain,
	mapTrashTasksDtoToDomain,
	type TrashProject,
	type TrashTask,
} from '../model'

export async function listTrashDeletedProjects(spaceId: string): Promise<TrashProject[]> {
	const projects = await listDeletedProjects({ spaceId })
	return mapTrashProjectsDtoToDomain(projects)
}

export async function listTrashDeletedTasks(spaceId: string): Promise<TrashTask[]> {
	const tasks = await listDeletedTasks({ spaceId })
	return mapTrashTasksDtoToDomain(tasks)
}
