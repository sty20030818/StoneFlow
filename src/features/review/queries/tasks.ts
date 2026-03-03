import { listTasks } from '@/services/api/tasks'

import type { WorkspaceTask } from '../model'

export async function listReviewDoneTasks(): Promise<WorkspaceTask[]> {
	return await listTasks({ status: 'done' })
}

export async function listReviewTasksByStatus(status: 'todo' | 'done'): Promise<WorkspaceTask[]> {
	return await listTasks({ status })
}
