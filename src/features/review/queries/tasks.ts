import { listTasks } from '@/infra/api/tasks'

import { mapWorkspaceTasksDtoToDomain, type WorkspaceTask } from '../model'

export async function listReviewDoneTasks(): Promise<WorkspaceTask[]> {
	const tasks = await listTasks({ status: 'done' })
	return mapWorkspaceTasksDtoToDomain(tasks)
}

export async function listReviewTasksByStatus(status: 'todo' | 'done'): Promise<WorkspaceTask[]> {
	const tasks = await listTasks({ status })
	return mapWorkspaceTasksDtoToDomain(tasks)
}
