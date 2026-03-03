import { listTasks } from '@/services/api/tasks'

import type { TaskDto } from '../model'

export async function listReviewDoneTasks(): Promise<TaskDto[]> {
	return await listTasks({ status: 'done' })
}

export async function listReviewTasksByStatus(status: 'todo' | 'done'): Promise<TaskDto[]> {
	return await listTasks({ status })
}
