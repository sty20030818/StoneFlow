import { restoreProject } from '@/services/api/projects'
import { restoreTasks } from '@/services/api/tasks'

export async function restoreTrashProject(projectId: string): Promise<void> {
	await restoreProject(projectId)
}

export async function restoreTrashTasks(taskIds: string[]): Promise<number> {
	return await restoreTasks(taskIds)
}
